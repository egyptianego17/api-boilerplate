import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('user_registrations_total')
    private readonly registrations: Counter<string>,

    @InjectMetric('user_logins_total')
    private readonly logins: Counter<string>,

    @InjectMetric('bullmq_job_duration_seconds')
    private readonly jobDuration: Histogram<string>,

    @InjectMetric('bullmq_job_failures_total')
    private readonly jobFailures: Counter<string>,
  ) {}

  recordRegistration(): void {
    this.registrations.inc();
  }

  recordLogin(method: 'password' | 'google' | 'otp'): void {
    this.logins.inc({ method });
  }

  recordJobDuration(queue: string, durationSeconds: number): void {
    this.jobDuration.observe({ queue }, durationSeconds);
  }

  recordJobFailure(queue: string, reason: string): void {
    this.jobFailures.inc({ queue, reason });
  }
}
