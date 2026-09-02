import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS liberado para o dev server do Angular consumir a API localmente.
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove do payload/query qualquer campo não declarado no DTO
      transform: true, // aplica @Type()/conversões do class-transformer antes do handler
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
