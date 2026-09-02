import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
}

/**
 * Filtro global de exceções: garante que toda resposta de erro da API,
 * seja um erro de validação/negócio (HttpException) ou uma falha inesperada,
 * siga sempre o mesmo formato JSON. Evita que erros não tratados vazem
 * stack traces ou formatos inconsistentes para o front-end.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? this.extractMessage(exception)
      : 'Erro interno do servidor';

    if (!isHttpException) {
      this.logger.error(exception);
    }

    const body: ErrorResponseBody = {
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    };

    response.status(statusCode).json(body);
  }

  private extractMessage(exception: HttpException): string | string[] {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    const responseMessage = (response as { message?: string | string[] })
      .message;
    return responseMessage ?? exception.message;
  }
}
