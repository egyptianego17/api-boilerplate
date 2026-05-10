import { Global, Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';

import { BullmqMetricsService } from './bullmq-metrics.service.js';
import { HttpMetricsInterceptor } from './http-metrics.interceptor.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      controller: MetricsController,
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),

    makeGaugeProvider({
      name: 'bullmq_jobs',
      help: 'Number of BullMQ jobs by queue and state',
      labelNames: ['queue', 'state'],
    }),
    makeHistogramProvider({
      name: 'bullmq_job_duration_seconds',
      help: 'Duration of BullMQ jobs in seconds',
      labelNames: ['queue'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    }),
    makeCounterProvider({
      name: 'bullmq_job_failures_total',
      help: 'Total BullMQ job failures',
      labelNames: ['queue', 'reason'],
    }),

    makeCounterProvider({
      name: 'user_registrations_total',
      help: 'Total user registrations',
    }),
    makeCounterProvider({
      name: 'user_logins_total',
      help: 'Total user logins',
      labelNames: ['method'],
    }),

    HttpMetricsInterceptor,
    BullmqMetricsService,
    MetricsService,
  ],
  exports: [HttpMetricsInterceptor, MetricsService],
})
export class MetricsModule {}
