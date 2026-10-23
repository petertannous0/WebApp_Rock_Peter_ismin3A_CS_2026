import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

/**
 * The entry point.
 *
 * `whitelist` strips fields not declared in the DTO; `forbidNonWhitelisted`
 * rejects the request outright, so a client cannot sneak in an unexpected property.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // One explicit origin, never '*': the front, on 8080 in compose, 5173 in development.
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });

  // Swagger UI on /docs, the OpenAPI document on /docs-json.
  const config = new DocumentBuilder()
    .setTitle('Soutenances de stage API')
    .setDescription('Get a token with POST /auth/login, then paste it in "Authorize".')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
