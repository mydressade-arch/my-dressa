import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppDataSource } from './database/data-source';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Ausstehende DB-Migrationen beim Start anwenden — zuverlässig im selben
  // Prozess, BEVOR der Server Anfragen annimmt. Ersetzt das fragile
  // "migration:run:prod && npm run start"-Verketten im Start-Befehl (das
  // nicht zuverlässig an den Start übergab). Der Start-Befehl ist jetzt nur
  // noch "npm run start".
  try {
    await AppDataSource.initialize();
    const applied = await AppDataSource.runMigrations();
    logger.log(
      applied.length
        ? `${applied.length} Migration(en) angewendet: ${applied.map(m => m.name).join(', ')}`
        : 'Keine ausstehenden Migrationen.',
    );
    await AppDataSource.destroy();
  } catch (e) {
    // Nicht mit kaputtem/veraltetem Schema weiterlaufen.
    logger.error('Migration beim Start fehlgeschlagen — Abbruch.', (e as Error).stack);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
