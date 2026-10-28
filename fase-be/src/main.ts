import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { setupSession } from './cms/config/session.config';
import { setupViews } from './cms/config/view.config';
import { toValidationException } from './domain/validation';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: toValidationException,
    }),
  );
  setupSession(app);
  setupViews(app);
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'cms', method: RequestMethod.ALL },
      { path: 'cms/{*path}', method: RequestMethod.ALL },
    ],
  });

  app.enableCors({
    origin: [
      'http://localhost:5173',
      ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
    ],
    methods: 'GET,POST,PUT,PATCH,DELETE',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FASE API')
    .setDescription('API cho Fase-Sales (nhân viên). Fase-CRM chạy tại /cms.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'swagger',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/api · CRM: http://localhost:${port}/cms · Swagger: http://localhost:${port}/swagger`, 'Bootstrap');
}
void bootstrap();
