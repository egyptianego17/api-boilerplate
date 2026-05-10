import { Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthCheckError, HealthIndicator } from '@nestjs/terminus';
import Redis from 'ioredis';

import { ApiConfigService } from '../../../shared/services/api-config.service.js';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly redis: Redis;

  constructor(configService: ApiConfigService) {
    super();
    this.redis = new Redis({
      ...configService.redisConfig,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.connect();
      const pong = await this.redis.ping();
      await this.redis.disconnect();

      if (pong !== 'PONG') {
        throw new Error(`Redis ping returned: ${pong}`);
      }

      return this.getStatus(key, true);
    } catch (error) {
      try {
        await this.redis.disconnect();
      } catch {
        // ignore disconnect errors
      }

      throw new HealthCheckError('Redis health check failed', {
        [key]: {
          status: 'down',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
