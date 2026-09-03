import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cabeçalhos de segurança HTTP recomendados pela própria doc do Nest
  // (junto com CORS e rate limiting, que já estão configurados aqui).
  app.use(helmet());

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

  // Doc interativa da API (Swagger UI) em /docs — padrão idiomático do
  // Nest para expor os DTOs/endpoints já documentados via decorators.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pedidos do Festival — API')
    .setDescription('API de visualização de pedidos de um festival (teste técnico full-stack).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
