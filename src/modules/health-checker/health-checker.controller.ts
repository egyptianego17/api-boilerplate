import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import type { HealthCheckResult } from '@nestjs/terminus';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

import { SkipResponseWrapping } from '../../decorators/skip-response-wrapping.decorator.js';
import { BullmqQueueHealthIndicator } from './health-indicators/bullmq-queue.indicator.js';
import { RedisHealthIndicator } from './health-indicators/redis.indicator.js';
import { ServiceHealthIndicator } from './health-indicators/service.indicator.js';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
export class HealthCheckerController {
  constructor(
    private healthCheckService: HealthCheckService,
    private ormIndicator: TypeOrmHealthIndicator,
    private serviceIndicator: ServiceHealthIndicator,
    private redisIndicator: RedisHealthIndicator,
    private bullmqQueueIndicator: BullmqQueueHealthIndicator,
  ) {}

  @Get()
  @SkipResponseWrapping()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.ormIndicator.pingCheck('database', { timeout: 1500 }),
      () => this.serviceIndicator.isHealthy('search-service-health'),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
  }

  @Get('liveness')
  @SkipResponseWrapping()
  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([]);
  }

  @Get('readiness')
  @SkipResponseWrapping()
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.ormIndicator.pingCheck('database', { timeout: 1500 }),
      () => this.serviceIndicator.isHealthy('search-service-health'),
      () => this.redisIndicator.isHealthy('redis'),
      () => this.bullmqQueueIndicator.isHealthy('bullmq-queue'),
    ]);
  }
}
