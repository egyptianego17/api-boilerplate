# Add a BullMQ Queue

Recipe for adding a background-job queue. Worked example: an `email-queue` that processes outgoing transactional email asynchronously, so the auth flow doesn't block on SendGrid.

---

## Concept

BullMQ runs on Redis. The boilerplate already wires up:

- **Connection + default options** in [`src/app.module.ts`](../../src/app.module.ts) via `BullModule.forRootAsync` — reads `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` from `ApiConfigService`. Default job options: `BULLMQ_DEFAULT_ATTEMPTS` retries with exponential backoff (`BULLMQ_BACKOFF_DELAY` ms base), `removeOnComplete: 1000`, `removeOnFail: 5000`.
- **Metrics** via [`BullmqMetricsService`](../../src/modules/metrics/bullmq-metrics.service.ts) — polls every queue listed in [`MONITORED_QUEUES`](../../src/modules/metrics/constants/monitored-queues.constants.ts) every 15 s and exposes the `bullmq_jobs{queue, state}` gauge to Prometheus.
- **Job-duration / job-failure metrics** — `MetricsService.recordJobDuration(queue, sec)` and `MetricsService.recordJobFailure(queue, reason)` are ready to call from your processor.

You add the queue, producer, and processor; everything else is already plumbed.

---

## Step 1 — Constants

```typescript
// src/modules/email-queue/constants/email-queue.constants.ts
export const EMAIL_QUEUE_NAME = 'email-queue';

export type EmailJobName = 'send-activation' | 'send-password-reset';

export interface EmailJobData {
  to: string;
  hash: string;
}
```

A typed job name + payload makes processors discoverable and prevents typos.

---

## Step 2 — Register the queue in the module

```typescript
// src/modules/email-queue/email-queue.module.ts
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { MailModule } from '../../shared/mail/mail.module.js';
import { EMAIL_QUEUE_NAME } from './constants/email-queue.constants.js';
import { EmailQueueProcessor } from './email-queue.processor.js';
import { EmailQueueService } from './email-queue.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMAIL_QUEUE_NAME }),
    MailModule,
  ],
  providers: [EmailQueueService, EmailQueueProcessor],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}
```

Then add `EmailQueueModule` to `src/app.module.ts`'s `imports` array.

---

## Step 3 — Producer

The producer is a plain service that injects the queue and calls `add()`.

```typescript
// src/modules/email-queue/email-queue.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  EMAIL_QUEUE_NAME,
  EmailJobData,
  EmailJobName,
} from './constants/email-queue.constants.js';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly queue: Queue<EmailJobData>,
  ) {}

  async enqueueActivation(to: string, hash: string): Promise<void> {
    await this.queue.add(
      'send-activation' satisfies EmailJobName,
      { to, hash },
      { jobId: `activation:${to}` },
    );
  }

  async enqueuePasswordReset(to: string, hash: string): Promise<void> {
    await this.queue.add(
      'send-password-reset' satisfies EmailJobName,
      { to, hash },
      { jobId: `pw-reset:${to}` },
    );
  }
}
```

Use `jobId` to deduplicate — adding the same `jobId` twice is a no-op while the previous job is still waiting/active.

---

## Step 4 — Processor

```typescript
// src/modules/email-queue/email-queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

import { MetricsService } from '../metrics/metrics.service.js';
import { MailService } from '../../shared/mail/mail.service.js';
import {
  EMAIL_QUEUE_NAME,
  EmailJobData,
  EmailJobName,
} from './constants/email-queue.constants.js';

@Processor(EMAIL_QUEUE_NAME)
export class EmailQueueProcessor extends WorkerHost {
  constructor(
    private readonly logger: PinoLogger,
    private readonly mailService: MailService,
    private readonly metricsService: MetricsService,
  ) {
    super();
    this.logger.setContext(EmailQueueProcessor.name);
  }

  async process(job: Job<EmailJobData, void, EmailJobName>): Promise<void> {
    const start = Date.now();

    try {
      switch (job.name) {
        case 'send-activation':
          await this.mailService.userSignUp({
            to: job.data.to,
            data: { hash: job.data.hash },
          });
          break;

        case 'send-password-reset':
          await this.mailService.forgotPassword({
            to: job.data.to,
            data: { hash: job.data.hash, tokenExpires: Date.now() + 3_600_000 },
          });
          break;
      }

      this.metricsService.recordJobDuration(
        EMAIL_QUEUE_NAME,
        (Date.now() - start) / 1000,
      );
    } catch (error) {
      this.metricsService.recordJobFailure(
        EMAIL_QUEUE_NAME,
        error instanceof Error ? error.constructor.name : 'unknown',
      );
      this.logger.error(
        { jobId: job.id, jobName: job.name, err: error },
        'Email job failed',
      );
      throw error; // let BullMQ retry per default options
    }
  }
}
```

**Why these choices:**
- Extends `WorkerHost` and uses `@Processor(QUEUE_NAME)` — this is the modern BullMQ-on-Nest pattern (the legacy `@Process` decorator is deprecated).
- Records duration + failures into Prometheus.
- Re-throws on error so BullMQ retries with the configured backoff. `removeOnFail: 5000` keeps the last 5 000 failed jobs around for debugging.

---

## Step 5 — Repeatable / scheduled jobs (optional)

If the job should run on a schedule (cron), register it in `onModuleInit()` using `upsertJobScheduler` (the modern replacement for the deprecated `add(..., { repeat: ... })` API):

```typescript
// inside EmailQueueService
import type { OnModuleInit } from '@nestjs/common';

async onModuleInit(): Promise<void> {
  await this.queue.upsertJobScheduler(
    'daily-digest',                          // unique scheduler key
    { pattern: '0 8 * * *', tz: 'UTC' },     // 08:00 UTC daily
    {
      name: 'send-digest' satisfies EmailJobName,
      data: { to: 'admin@example.com', hash: '' },
    },
  );
}
```

Always pass `tz` — DST handling without a timezone is a footgun.

---

## Step 6 — Surface the queue in metrics

Append the queue name to [`MONITORED_QUEUES`](../../src/modules/metrics/constants/monitored-queues.constants.ts):

```typescript
// src/modules/metrics/constants/monitored-queues.constants.ts
import { EMAIL_QUEUE_NAME } from '../../email-queue/constants/email-queue.constants.js';

export const MONITORED_QUEUES: string[] = [EMAIL_QUEUE_NAME];
```

`BullmqMetricsService.onModuleInit()` polls each queue every 15 s and updates the `bullmq_jobs{queue, state}` gauge for `active` / `completed` / `delayed` / `failed` / `waiting` states.

---

## Step 7 — Idempotency

BullMQ retries on failure. If your processor isn't idempotent, retries will produce duplicates.

Two patterns:

**A. Deduplicate at enqueue time** — use `jobId`:
```typescript
await this.queue.add('send-activation', payload, {
  jobId: `activation:${userId}:${dateKey}`,
});
```

**B. Deduplicate inside the processor** — check a unique constraint or a "has this run?" record before doing the work:
```typescript
const alreadySent = await this.dedupRepo.findOne({
  where: { idempotencyKey: job.data.idempotencyKey },
});
if (alreadySent) return;

await this.dedupRepo.save({ idempotencyKey: job.data.idempotencyKey });
await this.doTheWork(job.data);
```

Pattern A is enough when the job's *input* uniquely identifies the output. Pattern B is needed when the same logical operation can be requested under different `jobId`s.

---

## Smoke test

1. `docker compose -f docker-compose-local.yml up -d redis` (and the rest of the stack).
2. `npm run start:dev` — should log "BullMQ metrics collector started" with your queue name.
3. Enqueue a test job from a tmp endpoint or REPL: `await emailQueueService.enqueueActivation('test@example.com', 'fake-hash')`.
4. Check Grafana → API Overview → BullMQ panel. The `email-queue` should appear with `waiting`/`active`/`completed` counts moving.
5. Stop Redis (`docker stop api-redis-local`) and try again — the producer should fail to enqueue, surfacing in error logs. Restart Redis; the next call works.

---

## See also

- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) §14 — BullMQ rules
- [`../infrastructure/observability.md`](../infrastructure/observability.md) — reading the BullMQ dashboard
- [`exception-cookbook.md`](./exception-cookbook.md) — throwing typed exceptions from inside processors
- [BullMQ docs](https://docs.bullmq.io/) — upstream reference
