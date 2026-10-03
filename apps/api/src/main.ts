import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const allowedOrigins = corsOrigin.includes(',')
    ? corsOrigin.split(',').map((o) => o.trim())
    : corsOrigin;

  // Security middlewares
  app.use(helmet());
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('School ERP Copilot API')
    .setDescription('Role-aware RAG assistant API for School ERP')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/api`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
