# Observability Runbook

How to read the dashboards, what alerts to expect, and how to add new metrics. The full monitoring stack ships with the boilerplate — Prometheus + Loki + Grafana + AlertManager — defined in [`monitoring/`](../../monitoring/) and [`docker-compose-local.yml`](../../docker-compose-local.yml).

---

## The stack

```
┌─────────────┐
│ API process │  exposes /metrics (Prometheus exposition format)
│  (Pino logs │  pipes JSON logs to stdout AND to Loki via pino-loki
│   to stdout)│
└──────┬──────┘
       │
       │ scrape (15 s)            push (every log line)
       │                                        ┌──────┐
       └────────────┬───────────────┐──────────►│ Loki │
                    ▼               │           └──┬───┘
              ┌──────────┐          │              │
              │Prometheus│          │              ▼
              │  + rules │          │       ┌─────────┐
              └────┬─────┘          └──────►│ Grafana │
                   │                        └─────────┘
                   ▼
            ┌──────────────┐
            │ AlertManager │ → email / Slack
            └──────────────┘
```

---

## Service URLs (local stack)

| Service | URL | Default credentials |
|---|---|---|
| API metrics | <http://localhost:3000/metrics> | none (public) |
| Prometheus | <http://localhost:9092> | none |
| AlertManager | <http://localhost:9095> | none |
| Loki | <http://localhost:3100> | none (queried via Grafana) |
| Grafana | <http://localhost:3200> | `admin` / `GRAFANA_ADMIN_PASSWORD` (default `admin`) |

The full table for human reachable services is in the project [`README.md`](../../README.md).

---

## Built-in dashboards

Lives at `monitoring/grafana/dashboards/`, auto-provisioned via `monitoring/grafana/provisioning/`.

| Dashboard | What it shows | When to open it |
|---|---|---|
| **api-overview** | Request rate, error rate, p50/p95/p99 latency, top routes by traffic, BullMQ queue states | First stop when "the API feels off" |
| **database** | Postgres: connection count, query latency, slow queries, lock waits | "Why is *this query* slow?" |
| **infrastructure** | Process: RSS memory, CPU, event-loop lag, FD count, GC time | "Are we leaking?" / "Why are we restarting?" |
| **logs-explorer** | Loki query UI scoped to API logs | "Show me errors from the last 30 minutes" |

Open Grafana → left sidebar → Dashboards → choose. All four are pre-pinned.

---

## Built-in alerts

Defined in [`monitoring/alerts/api.rules.yml`](../../monitoring/alerts/api.rules.yml) and [`monitoring/alerts/infrastructure.rules.yml`](../../monitoring/alerts/infrastructure.rules.yml). Routed via [`monitoring/alertmanager/`](../../monitoring/alertmanager/) to whatever destination is configured (default: email via SendGrid using `MAIL_DEFAULT_EMAIL` → `ALERT_EMAIL_TO`; optional Slack webhook).

### API alerts (`api.rules.yml`)

| Alert | Condition | Severity | What to do |
|---|---|---|---|
| `HighErrorRate` | `5xx rate / total rate > 5 %` over 5 min | critical | Open `api-overview`; check the "Top routes by error rate" panel; jump to `logs-explorer` filtering `level=error` |
| `HighErrorRateByRoute` | `5xx rate / total > 10 %` *for any specific route* | warning | One endpoint is regressing. Find the route in `api-overview`; check recent deploys / dependent services |
| `HighLatency` | p95 `http_request_duration_seconds` > 2 s for 5 min | warning | Open `database` dashboard for slow queries; check downstream service latency in logs |
| `BullMQQueueBacklog` | `waiting + delayed > 200` jobs | warning | Open `api-overview` → BullMQ panel; check if processor is up; look for failed jobs that are blocking |

### Infrastructure alerts (`infrastructure.rules.yml`)

| Alert | Condition | Severity | What to do |
|---|---|---|---|
| `ProcessDown` | `up{job="api-boilerplate"} == 0` | critical | The API isn't responding to scrapes. Check container status / logs |
| `HighMemoryUsage` | RSS > 512 MB | warning | Look at infra dashboard — increasing trend? OK to ignore once if traffic-driven |
| `CriticalMemoryUsage` | RSS > 1 GB | critical | Likely a leak. Restart, then open `infrastructure` dashboard for trend; capture a heap dump |
| `MemoryLeakSuspected` | RSS rising > 5 MB / 30 min derivative | warning | Heap profile next deploy; check for unbounded caches / event listeners |
| `HighEventLoopLag` | p99 `nodejs_eventloop_lag_p99_seconds` > 0.5 s | warning | CPU-bound code on the main thread. Look for synchronous JSON parses, regex, etc. |
| `TooManyOpenFileDescriptors` | `process_open_fds / process_max_fds > 0.80` | warning | FD leak — usually unclosed sockets or files. Check log for connection errors |
| `PostgresExporterDown` | `up{job="postgres"} == 0` | critical | Exporter isn't reaching Postgres. Verify `postgres-exporter` container + `DATA_SOURCE_NAME` |
| `PostgresTooManyConnections` | `pg_stat_activity_count / pg_settings_max_connections > 0.80` | warning | Pool sized too high, or a leak. Inspect `database` dashboard |
| `RedisExporterDown` | `up{job="redis"} == 0` | critical | Same shape as Postgres exporter |

To tune thresholds, edit the YAML and reload Prometheus (`docker compose restart api-prometheus-local`).

---

## Metrics catalog

Every metric the API publishes. Defined in [`src/modules/metrics/metrics.module.ts`](../../src/modules/metrics/metrics.module.ts), recorded via [`MetricsService`](../../src/modules/metrics/metrics.service.ts) and [`HttpMetricsInterceptor`](../../src/modules/metrics/http-metrics.interceptor.ts) and [`BullmqMetricsService`](../../src/modules/metrics/bullmq-metrics.service.ts).

### HTTP RED

| Metric | Type | Labels | When recorded |
|---|---|---|---|
| `http_requests_total` | counter | `method`, `route`, `status_code` | Every HTTP response (via `HttpMetricsInterceptor`) |
| `http_request_duration_seconds` | histogram | `method`, `route`, `status_code` | Every HTTP response. Buckets: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10 |

### BullMQ

| Metric | Type | Labels | When recorded |
|---|---|---|---|
| `bullmq_jobs` | gauge | `queue`, `state` | Every 15 s by `BullmqMetricsService` for queues listed in `MONITORED_QUEUES` |
| `bullmq_job_duration_seconds` | histogram | `queue` | Inside processor: `metricsService.recordJobDuration(queue, sec)`. Buckets: 0.1, 0.5, 1, 2, 5, 10, 30, 60 |
| `bullmq_job_failures_total` | counter | `queue`, `reason` | Inside processor `catch`: `metricsService.recordJobFailure(queue, reason)` |

### User events

| Metric | Type | Labels | When recorded |
|---|---|---|---|
| `user_registrations_total` | counter | — | `MetricsService.recordRegistration()` from `AuthService.register` |
| `user_logins_total` | counter | `method` (`password` / `google` / `otp`) | `MetricsService.recordLogin('password' \| 'google' \| 'otp')` |

### Built-in defaults

`PrometheusModule.register({ defaultMetrics: { enabled: true } })` enables `prom-client`'s default Node.js metrics: `process_cpu_seconds_total`, `process_resident_memory_bytes`, `nodejs_*` (heap, GC, event-loop lag), file descriptors, etc. These power most of the **infrastructure** dashboard.

---

## Adding a metric

Four steps:

### 1. Declare the provider

In [`metrics.module.ts`](../../src/modules/metrics/metrics.module.ts), add a `make*Provider` call:

```typescript
makeCounterProvider({
  name: 'posts_created_total',
  help: 'Total posts created',
}),
```

### 2. Inject and expose a typed method

In [`metrics.service.ts`](../../src/modules/metrics/metrics.service.ts):

```typescript
constructor(
  // ...
  @InjectMetric('posts_created_total')
  private readonly postsCreated: Counter<string>,
) {}

recordPostCreated(): void {
  this.postsCreated.inc();
}
```

### 3. Call from business code

```typescript
// inside PostService.create
const post = await this.postRepository.save(...);
this.metricsService.recordPostCreated();
return post;
```

### 4. (Optional) Add a Grafana panel

Edit `monitoring/grafana/dashboards/api-overview.json` (or create a new dashboard). The simplest panel is a `Stat` showing `sum(rate(posts_created_total[5m]))`.

`MetricsService` is `@Global` — no module wiring needed.

---

## Logging

### Configuration

`LoggerModule` is registered in `app.module.ts` and uses `nestjs-pino`. When `LOKI_URL` is set, logs ship to Loki via `pino-loki`; otherwise they go to stdout only.

The log format is JSON with these standard fields: `level`, `time`, `pid`, `hostname`, `req` (request id, method, url), `res` (status, latency), plus whatever structured fields you add.

### What level to use

| Level | When |
|---|---|
| `error` | Unexpected failures, external service errors. **These are alertable.** Always include `err: error` so the stack trace serializes. |
| `warn` | Suspicious states, recoverable issues, security events (failed login, replayed token). |
| `info` | Significant business events: user registered, payment captured. **Rare** — never per-request. |
| `debug` | Almost never. Local dev only. Disabled by default in `production` because of `LOG_LEVEL=info`. |

**Never log:** successful CRUD operations, request/response bodies, function entry/exit, variable values for tracing.

### Adding context

Always set the class context in the constructor:

```typescript
constructor(private readonly logger: PinoLogger) {
  this.logger.setContext(MyService.name);
}
```

For per-call structured fields, pass an object as the first arg:

```typescript
this.logger.error({ userId, jobId, err: error }, 'Job processing failed');
```

This produces JSON like:
```json
{"level":50,"context":"MyService","userId":"...","jobId":"...","err":{...},"msg":"Job processing failed"}
```

### Reading logs in Grafana

1. Open `logs-explorer` dashboard.
2. Adjust the time range (top-right).
3. Filter by label: `{app="api-boilerplate", level="error"}`.
4. To find a specific user's recent errors: add `|= "userId" |= "<uuid>"` to the LogQL query.
5. Loki is *not* fast for free-text search across long ranges — narrow by labels first.

---

## "It's slow / failing — where do I look?"

Three example incidents and the runbook for each.

### A. Users report sporadic 500s

1. **api-overview** → "Error rate" panel. If > 1 %, alert is probably already firing.
2. Same dashboard → "Top routes by error rate" — which endpoint?
3. Switch to **logs-explorer**: `{app="api-boilerplate", level="error"} |= "<route>"` for the last 30 min.
4. Read the stack traces. Group by `err.constructor` to see if it's one root cause.
5. If it correlates with a deploy: `git log` on `main` and check the diff for the impacted route.

### B. p95 latency spike

1. **api-overview** → "Latency p95" — confirm it's real, not a single outlier dragging the histogram.
2. Same dashboard → "Slowest routes (p95)" panel.
3. Open **database** → "Slow queries" panel. If a specific query stands out, that's your culprit.
4. If DB looks clean, check **infrastructure** → "Event-loop lag" panel. CPU-bound JavaScript stalls everything.
5. Check **api-overview** → "BullMQ" panel — a backed-up queue can starve the main loop if processors run in-process.

### C. Memory creeping up

1. **infrastructure** → "Process RSS" panel. Trend up over hours/days?
2. Same dashboard → "Heap used vs. heap total" — if heap is growing but RSS is stable, it's expected GC behavior.
3. If heap is also growing: take a heap snapshot (`node --inspect` and Chrome DevTools, or `npx clinic heapprofiler`) on the next deploy.
4. Check for: unbounded caches (Maps/Sets that only grow), event listeners on long-lived objects, leaked DB connections (Postgres pool size in **database** dashboard).

---

## See also

- [`../guides/add-a-queue.md`](../guides/add-a-queue.md) — wiring metrics into a new BullMQ queue
- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) §2 — logging guidelines
- [`../guides/env-vars.md`](../guides/env-vars.md) — `LOKI_URL`, `GRAFANA_ADMIN_PASSWORD`, `LOG_LEVEL`
- [`deployment.md`](./deployment.md) — running the monitoring stack outside of local
