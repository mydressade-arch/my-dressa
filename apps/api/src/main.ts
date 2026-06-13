import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  // CORS: erlaubt Production-Frontend + lokale Entwicklung (Flutter Web, Next dev)
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://mydressa.de',
    'https://www.mydressa.de',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Kein Origin (mobile Apps, curl) oder localhost (jeder Port) immer erlauben
      if (!origin ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // im Zweifel erlauben (öffentliche Shop-API)
    },
    credentials: true,
  });

  // FIX: whitelist=true aber forbidNonWhitelisted=false
  // Damit shippingAddress und andere Extra-Felder nicht rejected werden
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,  // ← KEY FIX
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('My Dressa API')
      .setDescription('Fashion Marketplace — Kauf & Vermietung')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('Swagger: http://localhost:3001/docs');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`API: http://localhost:${port}/api/v1`);
}
bootstrap();
