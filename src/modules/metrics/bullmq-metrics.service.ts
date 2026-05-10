import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';
import type { Gauge } from 'prom-client';

import { ApiConfigService } from '../../shared/services/api-config.service.js';
import { MONITORED_QUEUES } from './constants/monitored-queues.constants.js';

@Injectable()
export class BullmqMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly queues: Map<string, Queue> = new Map();

  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    @InjectMetric('bullmq_jobs')
    private readonly jobsGauge: Gauge<string>,
    private readonly configService: ApiConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BullmqMetricsService.name);

    for (const queueName of MONITORED_QUEUES) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: this.configService.redisConfig }),
      );
    }
  }

  onModuleInit(): void {
    if (this.queues.size === 0) {
      return;
    }

    this.intervalId = setInterval(() => {
      void this.updateMetrics();
    }, 15_000);

    void this.updateMetrics();
    this.logger.info(
      { queues: [...this.queues.keys()] },
      'BullMQ metrics collector started',
    );
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async updateMetrics(): Promise<void> {
    for (const [queueName, queue] of this.queues) {
      try {
        const counts = await queue.getJobCounts(
          'active',
          'completed',
          'delayed',
          'failed',
          'waiting',
        );

        for (const [state, count] of Object.entries(counts)) {
          this.jobsGauge.set({ queue: queueName, state }, count);
        }
      } catch (error) {
        this.logger.warn(
          {
            queue: queueName,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to collect BullMQ metrics',
        );
      }
    }
  }
}
