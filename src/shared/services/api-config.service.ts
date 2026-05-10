import path from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ThrottlerOptions } from '@nestjs/throttler';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import parse from 'parse-duration';

import { TransactionContextSubscriber } from '../../entity-subscribers/transaction-context.subscriber.js';
import { UserSubscriber } from '../../entity-subscribers/user-subscriber.js';
import { SnakeNamingStrategy } from '../../snake-naming.strategy.js';

@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  private getNumber(key: string): number {
    const value = this.get(key);
    const num = Number(value);

    if (Number.isNaN(num)) {
      throw new TypeError(
        `Environment variable ${key} must be a number. Received: ${value}`,
      );
    }

    return num;
  }

  private getDuration(
    key: string,
    format?: Parameters<typeof parse>[1],
  ): number {
    const value = this.getString(key);
    const duration = parse(value, format);

    if (duration === null) {
      throw new Error(
        `Environment variable ${key} must be a valid duration. Received: ${value}`,
      );
    }

    return duration;
  }

  private getBoolean(key: string): boolean {
    const value = this.get(key);

    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(
        `Environment variable ${key} must be a boolean. Received: ${value}`,
      );
    }
  }

  private getString(key: string): string;
  private getString(key: string, options: { defaultValue: string }): string;
  private getString(
    key: string,
    options: { optional: true },
  ): string | undefined;
  private getString(
    key: string,
    options?: { defaultValue?: string; optional?: boolean },
  ): string | undefined {
    const value = this.configService.get<string>(key);

    if (value === undefined) {
      if (options?.defaultValue !== undefined) {
        return options.defaultValue;
      }

      if (options?.optional) {
        return undefined;
      }

      throw new Error(`${key} environment variable doesn't exist`);
    }

    return value.toString().replaceAll(String.raw`\n`, '\n');
  }

  get nodeEnv(): string {
    return this.getString('NODE_ENV');
  }

  get fallbackLanguage(): string {
    return this.getString('FALLBACK_LANGUAGE');
  }

  get throttlerConfigs(): ThrottlerOptions {
    return {
      ttl: this.getDuration('THROTTLER_TTL', 'second'),
      limit: this.getNumber('THROTTLER_LIMIT'),
      // storage: new ThrottlerStorageRedisService(new Redis(this.redis)),
    };
  }

  get postgresConfig(): TypeOrmModuleOptions {
    const entities = [
      path.join(import.meta.dirname, `../../modules/**/*.entity{.ts,.js}`),
      path.join(import.meta.dirname, `../../modules/**/*.view-entity{.ts,.js}`),
    ];
    const migrations = [
      path.join(import.meta.dirname, `../../database/migrations/*{.ts,.js}`),
    ];

    return {
      entities,
      migrations,
      dropSchema: this.isTest,
      type: 'postgres',
      host: this.getString('DB_HOST'),
      port: this.getNumber('DB_PORT'),
      username: this.getString('DB_USERNAME'),
      password: this.getString('DB_PASSWORD'),
      database: this.getString('DB_DATABASE'),
      subscribers: [UserSubscriber, TransactionContextSubscriber],
      migrationsRun: !this.getBoolean('DB_SYNCHRONIZE'),
      synchronize: this.getBoolean('DB_SYNCHRONIZE'),
      logging: this.getBoolean('ENABLE_ORM_LOGS'),
      namingStrategy: new SnakeNamingStrategy(),
    };
  }

  get awsS3Config() {
    return {
      endpoint: this.getString('AWS_S3_ENDPOINT', { optional: true }),
      publicUrl: this.getString('AWS_S3_PUBLIC_URL', { optional: true }),
      accessKeyId: this.getString('AWS_S3_ACCESS_KEY_ID', { optional: true }),
      secretAccessKey: this.getString('AWS_S3_SECRET_ACCESS_KEY', {
        optional: true,
      }),
      bucketRegion: this.getString('AWS_S3_BUCKET_REGION'),
      bucketApiVersion: this.getString('AWS_S3_API_VERSION'),
      bucketName: this.getString('AWS_S3_BUCKET_NAME'),
      forcePathStyle: this.getBoolean('AWS_S3_FORCE_PATH_STYLE'),
    };
  }

  get documentationEnabled(): boolean {
    return this.getBoolean('ENABLE_DOCUMENTATION');
  }

  get natsEnabled(): boolean {
    return this.getBoolean('NATS_ENABLED');
  }

  get natsConfig() {
    return {
      host: this.getString('NATS_HOST'),
      port: this.getNumber('NATS_PORT'),
    };
  }

  get authConfig() {
    const encryptionKey = this.getString('ENCRYPTION_KEY');

    if (Buffer.from(encryptionKey, 'hex').length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    }

    return {
      privateKey: this.getString('JWT_PRIVATE_KEY'),
      publicKey: this.getString('JWT_PUBLIC_KEY'),
      jwtExpirationTime: this.getNumber('JWT_EXPIRATION_TIME'),
      encryptionKey,
    };
  }

  get appConfig() {
    return {
      port: this.getNumber('PORT'),
    };
  }

  get mailConfig() {
    return {
      sendgridApiKey: this.getString('SENDGRID_API_KEY'),
      defaultEmail: this.getString('MAIL_DEFAULT_EMAIL'),
      defaultName: this.getString('MAIL_DEFAULT_NAME', {
        defaultValue: 'API Boilerplate',
      }),
      workingDirectory: this.getString('PWD', {
        defaultValue: process.cwd(),
      }),
      frontendDomain: this.getString('FRONTEND_DOMAIN'),
      appName: this.getString('APP_NAME', { defaultValue: 'API Boilerplate' }),
    };
  }

  get twoFactorConfig() {
    return {
      appName: this.getString('APP_NAME', { defaultValue: 'API Boilerplate' }),
      issuer: this.getString('TWO_FACTOR_ISSUER', {
        defaultValue: 'API Boilerplate',
      }),
      codeDigits: this.getNumber('TWO_FACTOR_CODE_DIGITS') || 6,
      codeValidityWindow: this.getNumber('TWO_FACTOR_VALIDITY_WINDOW') || 1,
      recoveryCodesCount: this.getNumber('RECOVERY_CODES_COUNT') || 10,
    };
  }

  get redisConfig(): { host: string; port: number; password?: string } {
    return {
      host: this.getString('REDIS_HOST'),
      port: this.getNumber('REDIS_PORT'),
      password:
        this.getString('REDIS_PASSWORD', { optional: true }) || undefined,
    };
  }

  get bullmqConfig() {
    return {
      defaultAttempts: this.getNumber('BULLMQ_DEFAULT_ATTEMPTS') || 3,
      backoffDelay: this.getNumber('BULLMQ_BACKOFF_DELAY') || 5000,
    };
  }

  get logLevel(): string {
    return this.getString('LOG_LEVEL', {
      defaultValue: this.isDevelopment ? 'debug' : 'info',
    });
  }

  get lokiUrl(): string | undefined {
    return this.getString('LOKI_URL', { optional: true }) || undefined;
  }

  get postgresConnectionString(): string {
    const host = this.getString('DB_HOST');
    const port = this.getNumber('DB_PORT');
    const username = this.getString('DB_USERNAME');
    const password = this.getString('DB_PASSWORD');
    const database = this.getString('DB_DATABASE');

    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  private get(key: string): string {
    const value = this.configService.get<string>(key);

    if (value == null) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    return value;
  }
}
