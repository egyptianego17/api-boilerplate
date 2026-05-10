import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import path from 'path';
import { DataSource } from 'typeorm';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';
import { fileURLToPath } from 'url';

import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import googleConfig from './modules/auth-google/auth-google.config.js';
import { AuthGoogleModule } from './modules/auth-google/auth-google.module.js';
import { HealthCheckerModule } from './modules/health-checker/health-checker.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { UserModule } from './modules/user/user.module.js';
import { ContextProvider } from './providers/context.provider.js';
import { LoggerModule } from './shared/logger/logger.module.js';
import { ApiConfigService } from './shared/services/api-config.service.js';
import { SharedModule } from './shared/shared.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Module({
  imports: [
    LoggerModule,
    MetricsModule,
    AuditModule,
    AuthModule,
    AuthGoogleModule,
    UserModule,
    UploadModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (_cls, req: { id?: string }) => {
          if (typeof req.id === 'string') {
            ContextProvider.setRequestId(req.id);
          }
        },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: seconds(1),
          limit: 3,
        },
        {
          name: 'medium',
          ttl: seconds(10),
          limit: 20,
        },
        {
          name: 'long',
          ttl: seconds(60),
          limit: 100,
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [googleConfig],
    }),
    BullModule.forRootAsync({
      imports: [SharedModule],
      useFactory: (configService: ApiConfigService) => ({
        connection: configService.redisConfig,
        defaultJobOptions: {
          attempts: configService.bullmqConfig.defaultAttempts,
          backoff: {
            type: 'exponential' as const,
            delay: configService.bullmqConfig.backoffDelay,
          },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      }),
      inject: [ApiConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [SharedModule],
      useFactory: (configService: ApiConfigService) =>
        configService.postgresConfig,
      inject: [ApiConfigService],
      dataSourceFactory: (options) => {
        if (!options) {
          throw new Error('Invalid options passed');
        }

        const existingDataSource = getDataSourceByName('default');

        if (existingDataSource) {
          return Promise.resolve(existingDataSource);
        }

        return Promise.resolve(
          addTransactionalDataSource(new DataSource(options)),
        );
      },
    }),
    I18nModule.forRootAsync({
      imports: [SharedModule],
      useFactory: (configService: ApiConfigService) => ({
        fallbackLanguage: configService.fallbackLanguage ?? 'en',
        loaderOptions: {
          path: path.join(__dirname, '/i18n/'),
          watch: true,
        },
        typesOutputPath: path.join(
          __dirname,
          '../src/generated/i18n.generated.ts',
        ),
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
      inject: [ApiConfigService],
    }),
    HealthCheckerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
