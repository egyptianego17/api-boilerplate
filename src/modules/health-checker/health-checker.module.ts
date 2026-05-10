import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthCheckerController } from './health-checker.controller.js';
import { BullmqQueueHealthIndicator } from './health-indicators/bullmq-queue.indicator.js';
import { RedisHealthIndicator } from './health-indicators/redis.indicator.js';
import { ServiceHealthIndicator } from './health-indicators/service.indicator.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthCheckerController],
  providers: [
    ServiceHealthIndicator,
    RedisHealthIndicator,
    BullmqQueueHealthIndicator,
  ],
})
export class HealthCheckerModule {}
