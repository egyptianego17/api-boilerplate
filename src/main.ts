import './boilerplate.polyfill.js';

import {
  ClassSerializerInterceptor,
  HttpStatus,
  VersioningType,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { I18nValidationPipe } from 'nestjs-i18n';
import { Logger } from 'nestjs-pino';
import { initializeTransactionalContext } from 'typeorm-transactional';

import { AppModule } from './app.module.js';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
} from './filters/http-exception.filter.js';
import { CustomI18nValidationExceptionFilter } from './filters/i18n-validation-exception.filter.js';
import { QueryFailedFilter } from './filters/query-failed.filter.js';
import { SuccessResponseInterceptor } from './interceptors/success-response.interceptor.js';
import { HttpMetricsInterceptor } from './modules/metrics/http-metrics.interceptor.js';
import { setupSwagger } from './setup-swagger.js';
import { ApiConfigService } from './shared/services/api-config.service.js';
import { SharedModule } from './shared/shared.module.js';

export async function bootstrap(): Promise<NestExpressApplication> {
  initializeTransactionalContext();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || [
          'http://localhost:3000',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
      },
      // Buffer logs until Pino logger is ready
      bufferLogs: true,
    },
  );

  // Use Pino logger as the default NestJS logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  app.set('query parser', 'extended'); // Enable extended query parser for array support (e.g., status[]=value)
  app.use(helmet());
  app.use(compression());

  // Enable URI versioning with default version 1
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const reflector = app.get(Reflector);

  // Get logger instance for exception filters
  const configService = app.select(SharedModule).get(ApiConfigService);

  app.useGlobalFilters(
    new AllExceptionsFilter(logger),
    new HttpExceptionFilter(logger),
    new CustomI18nValidationExceptionFilter(),
    new QueryFailedFilter(reflector),
  );

  const httpMetricsInterceptor = app.get(HttpMetricsInterceptor);

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new SuccessResponseInterceptor(reflector),
    httpMetricsInterceptor,
  );

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // only start nats if it is enabled
  if (configService.natsEnabled) {
    const natsConfig = configService.natsConfig;
    app.connectMicroservice({
      transport: Transport.NATS,
      options: {
        url: `nats://${natsConfig.host}:${natsConfig.port}`,
        queue: 'main_service',
      },
    });

    await app.startAllMicroservices();
  }

  if (configService.documentationEnabled) {
    setupSwagger(app);
  }

  // Starts listening for shutdown hooks
  if (!configService.isDevelopment) {
    app.enableShutdownHooks();
  }

  const port = configService.appConfig.port;

  await app.listen(port);
  logger.log(`Server running on ${await app.getUrl()}`, 'Bootstrap');

  return app;
}

bootstrap();
