import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-adapter';

/**
 * Production safety checks
 * Ensures the application is properly configured before starting in production mode
 */
function validateProductionConfig(): void {
  const logger = new Logger('Bootstrap');
  const isProductionMode = process.env.PRODUCTION_MODE === 'true';
  const enableMockJobs = process.env.ENABLE_MOCK_JOBS === 'true';
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasRedisUrl = !!process.env.REDIS_URL;

  if (!isProductionMode) {
    logger.warn('Running in DEVELOPMENT mode. Set PRODUCTION_MODE=true for production.');
    return;
  }

  logger.log('Production mode enabled. Running safety checks...');

  const errors: string[] = [];

  // Check 1: Mock jobs must be disabled in production
  if (enableMockJobs) {
    errors.push(
      'ENABLE_MOCK_JOBS=true is not allowed in production mode. ' +
        'This would create fake job listings mixed with real ones.',
    );
  }

  // Check 2: OpenAI API key is required in production
  if (!hasOpenAIKey) {
    errors.push(
      'OPENAI_API_KEY is required in production mode. ' +
        'AI features will not work without it.',
    );
  }

  // Check 3: Redis is required in production (no in-memory fallback)
  if (!hasRedisUrl) {
    errors.push(
      'REDIS_URL is required in production mode. ' +
        'In-memory queue fallback is not suitable for production.',
    );
  }

  if (errors.length > 0) {
    logger.error('Production configuration errors detected:');
    errors.forEach((err, i) => logger.error(`  ${i + 1}. ${err}`));
    logger.error('');
    logger.error('Please fix these configuration issues and restart.');
    logger.error('If you are testing locally, set PRODUCTION_MODE=false');
    process.exit(1);
  }

  logger.log('All production safety checks passed.');
}

async function bootstrap() {
  // Validate production configuration before starting
  validateProductionConfig();

  const app = await NestFactory.create(AppModule);

  // WebSocket with Redis adapter for multi-instance scaling
  const redisAdapter = new RedisIoAdapter(app, process.env.REDIS_URL);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('TripaliumAI API')
    .setDescription('Job search automation API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
