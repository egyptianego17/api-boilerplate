# Architecture

A 5-minute orientation. Read this before [`conventions/coding-standards.md`](./conventions/coding-standards.md) so the patterns there make sense in context.

---

## Stack at a glance

NestJS 11 (SWC, ESM) on Node 22+, TypeORM 0.3 against PostgreSQL 15, Redis 7 driving BullMQ, Pino logs streamed to Loki, Prometheus scraping `/metrics`, Grafana on top, AlertManager for routing. JWT (RS256) auth with refresh tokens, 2FA TOTP, Google OAuth. SendGrid + Handlebars for transactional mail. AWS S3 / MinIO for uploads. nestjs-i18n for `en` / `ar` / `fr`. Full version table in [`technologies.md`](./technologies.md).

---

## Module map

The application module ([`src/app.module.ts`](../src/app.module.ts)) wires up six feature modules plus the cross-cutting infrastructure modules. There are no domain modules — this is a starter, not a product.

| Module | Path | Responsibility |
|---|---|---|
| `AuthModule` | `src/modules/auth/` | Register, login, refresh, password reset, email verify, 2FA, recovery codes |
| `AuthGoogleModule` | `src/modules/auth-google/` | Google OAuth strategy, builds on `AuthModule` |
| `UserModule` | `src/modules/user/` | Profile (`/users/me`), avatar, settings, change password, request/confirm email change |
| `UploadModule` | `src/modules/upload/` | Generic file uploads with image validation, S3/MinIO via `AwsS3Service` |
| `HealthCheckerModule` | `src/modules/health-checker/` | `/health` (DB + Redis) for k8s-style liveness/readiness |
| `MetricsModule` | `src/modules/metrics/` | `/metrics` Prometheus exporter; HTTP RED, BullMQ gauge/duration/failures, user counters |

Cross-cutting modules in `app.module.ts`: `LoggerModule` (Pino), `SharedModule` (`ApiConfigService` + S3/Crypto/Turnstile/Validator/Translation/ImageProcessing/Generator services), `ClsModule` (request-scoped context), `ThrottlerModule`, `BullModule`, `TypeOrmModule`, `I18nModule`.

---

## Request lifecycle

What happens to an HTTP request, in order. Each step is a real class — file paths included so you can trace.

1. **Express adapter receives the request** (`src/main.ts`).
2. **`helmet()` + `compression()` + CORS** apply (configured in `bootstrap`).
3. **URI versioning** strips the `/v1/` prefix.
4. **`ClsModule` middleware** opens a request-scoped context store (`nestjs-cls`).
5. **`ThrottlerGuard`** (registered as `APP_GUARD` in `app.module.ts`) checks rate limits — three tiers (`short`/`medium`/`long`) configured at app level, overridable per-controller via `@Throttle({...})`.
6. **`AuthGuard`** runs if the route uses `@Protected(...)` — verifies the JWT (RS256, public-key from `JWT_PUBLIC_KEY`) via Passport. Public routes are marked with `@PublicRoute(true)`. See [`src/decorators/protected.decorator.ts`](../src/decorators/protected.decorator.ts).
7. **`SystemRoleGuard`** runs when `@Protected({ systemRole: ... })` is used — checks the user's `systemRole` against the metadata set by `@SystemRoles(...)`.
8. **`AuthUserInterceptor`** stashes the authenticated user + language code into the CLS store via `ContextProvider` (`src/providers/context.provider.ts`) so deep service code can read them without parameter-drilling.
9. **`I18nValidationPipe`** validates the request body/query against the input DTO (whitelist + forbid extra props + transform). Errors throw a validation exception caught below.
10. **Controller** maps the request to a service call. Pulls the user via `@AuthUser()`, IDs via `@UUIDParam()`, body via `@Body()`. Always returns DTOs.
11. **Service** does the work. Validates first, throws specific exceptions on bad state, otherwise calls into the repository and returns an entity (or void). Multi-table writes are wrapped in `@Transactional()` from `typeorm-transactional`.
12. **Repository** runs parameterized TypeORM queries. Repositories extend `Repository<Entity>` and inject `DataSource` directly.
13. **Entity → DTO** conversion happens at the controller boundary via `entity.toDto()` (powered by `@UseDto(SomeDto)` and `AbstractEntity`).
14. **`SuccessResponseInterceptor`** ([`src/interceptors/success-response.interceptor.ts`](../src/interceptors/success-response.interceptor.ts)) wraps the return value in the standard envelope `{ success: true, statusCode, data, message?, timestamp, path }`. Endpoints decorated with `@SkipResponseWrapping()` opt out (e.g., file streams).
15. **Errors** propagate to the global filter chain (in order): `AllExceptionsFilter` → `HttpExceptionFilter` (translates `BaseI18nException.errorCode` via i18n) → `CustomI18nValidationExceptionFilter` → `QueryFailedFilter` (maps DB constraint violations to user-friendly errors). All produce the standard `ErrorResponseDto` shape — see [`conventions/api-responses.md`](./conventions/api-responses.md).
16. **`HttpMetricsInterceptor`** records the request duration + status code into the Prometheus `http_request_duration_seconds` histogram and `http_requests_total` counter.

---

## Cross-cutting infrastructure

### TypeORM
- **Naming:** `SnakeNamingStrategy` (`src/snake-naming.strategy.ts`) — entity columns are camelCase, DB columns are snake_case.
- **Base class:** [`AbstractEntity`](../src/common/abstract.entity.ts) provides `id`, `createdAt`, `updatedAt`, `toDto()`.
- **Transactions:** `typeorm-transactional` with `addTransactionalDataSource()` registered in `app.module.ts`. Use `@Transactional()` to opt in.
- **Subscribers:** `UserSubscriber` (`src/entity-subscribers/user-subscriber.ts`) auto-hashes `password` on insert/update via `bcrypt`.

### Request-scoped context (`nestjs-cls`)
`ContextProvider` (`src/providers/context.provider.ts`) exposes `getAuthUser()` / `getLanguage()` so deep code can read who's calling without threading the user through every method.

### Logger (Pino)
`LoggerModule` registers `nestjs-pino` globally. Use `PinoLogger` injected with `this.logger.setContext(ClassName.name)` in constructors. When `LOKI_URL` is set, logs ship to Loki via `pino-loki` for Grafana querying.

### Metrics (Prometheus)
`MetricsModule` (`@Global`) registers a fixed set of metric providers (HTTP RED, BullMQ gauges, user counters) and exposes `/metrics`. Inject `MetricsService` and call typed methods (`recordRegistration()`, `recordLogin()`, `recordJobDuration()`, `recordJobFailure()`). See [`infrastructure/observability.md`](./infrastructure/observability.md) for adding new metrics.

### BullMQ
`BullModule.forRootAsync` in `app.module.ts` configures the Redis connection and default job options (3 attempts, exponential backoff). Per-queue config goes in module files via `BullModule.registerQueueAsync`. Recipe: [`guides/add-a-queue.md`](./guides/add-a-queue.md).

### i18n (nestjs-i18n)
Locale resolved by query (`?lang=ar`), `x-lang` header, or `Accept-Language`, falling back to `FALLBACK_LANGUAGE`. JSONs live in `src/i18n/{en,ar,fr}/`. The type stub at `src/generated/i18n.generated.ts` is regenerated on boot when JSON files change.

### Audit log
A unified row-change + business-event audit, captured at the database layer.

- **Source of truth:** the `audit_log` table (extends `AbstractEntity` — uuid id, `created_at`, `updated_at`), populated by the generic `record_row_change()` Postgres trigger.
- **Bootstrap:** [`AuditService.onApplicationBootstrap()`](../src/modules/audit/services/audit.service.ts) installs `record_row_change()` and `attach_audit_log()` via `CREATE OR REPLACE FUNCTION`, then iterates [`AUDITED_TABLES`](../src/modules/audit/audited-tables.ts) calling `attach_audit_log(...)` for each. Idempotent — safe on every boot.
- **Coverage:** every INSERT / UPDATE / DELETE on attached tables — including rows deleted by `ON DELETE CASCADE` — plus app-emitted EVENT rows.
- **Actor context:** [`TransactionContextSubscriber`](../src/entity-subscribers/transaction-context.subscriber.ts) hooks `beforeInsert` / `beforeUpdate` / `beforeRemove` and writes `app.current_user_id` and `app.request_id` to session GUCs via `set_config(...)`. The trigger reads them via `current_setting(name, true)`.
- **Request correlation:** pino-http's `genReqId` ([`src/shared/logger/logger.module.ts`](../src/shared/logger/logger.module.ts)) validates inbound `x-request-id` as UUID (or generates one), and the CLS setup callback in `app.module.ts` copies it into `ContextProvider.setRequestId(...)`. All audit rows from the same request share `request_id` — including DELETE rows from cascaded children.
- **Sensitive columns:** redaction list per table lives in [`AUDITED_TABLES`](../src/modules/audit/audited-tables.ts) and is passed as variadic trigger args. Redacted columns appear as `"<redacted>"` in `old_data` / `new_data`.
- **Business events:** [`AuditService.record(event: AuditEvent, options)`](../src/modules/audit/services/audit.service.ts) inserts EVENT rows. Event names are an enum ([`AuditEvent`](../src/modules/audit/constants/audit-event.ts)) with a typed `namespace` map — adding an event without a namespace mapping is a compile error.
- **Adding a table:** append to `AUDITED_TABLES`; next boot installs the trigger. Partitioning is forfeited under sync mode — re-introduce via a one-off migration if row volume warrants it.
- **Recipe:** [`guides/add-an-audited-entity.md`](./guides/add-an-audited-entity.md).

### Polyfills
[`src/boilerplate.polyfill.ts`](../src/boilerplate.polyfill.ts) extends `Array.prototype` with `.toDtos()`, `.toPageDto()`, `.getByLanguage()` and `SelectQueryBuilder.prototype` with `.searchByString()`, `.paginate()`. Imported as the very first line of `main.ts` so prototypes are extended before any other code runs.

---

## Design constraints

These are baked into the boilerplate. Changing them isn't a "tweak" — it's a fork.

- **Single-tenant.** No `Organization` / `OrganizationMembership` / `OrganizationInvitation`. The auth model is `(user)` not `(user × organization)`. If you need multi-tenancy, you're adding it; it's not lurking unimplemented.
- **ESM modules with `.js` import extensions.** TypeScript compiles to ESM, and Node's ESM resolver requires the file extension at the import site even for `.ts` source. Always write `from './foo.js'`, never `from './foo'`.
- **Branded `Uuid` type.** `Uuid = string & { _uuidBrand: undefined }` — see `src/types.ts`. Cast `as Uuid` only at request boundaries (controllers).
- **No `process.env` in business code.** All env reads go through `ApiConfigService`. See [`guides/env-vars.md`](./guides/env-vars.md).
- **One entity per module.** Don't share entities across modules — exporting the repository is the right way for another module to query.
- **API versioning is URI-based, default `v1`.** Routes resolve as `/v1/users/me`, etc.
- **Errors are i18n keys, not strings.** Every throw is a class extending `BaseI18nException` with an `error.*` key. The filter translates at the edge.

---

## What lives where

Quick map for "where does this kind of thing go?" Lookups.

| Kind of thing | Location |
|---|---|
| Base entity / DTO classes | `src/common/` |
| Pagination DTOs | `src/common/dto/page*.dto.ts` |
| Custom field decorators (`@StringField`, `@UUIDField`, etc.) | `src/decorators/field.decorators.ts` |
| `@Protected`, `@AuthUser`, `@PublicRoute` | `src/decorators/` |
| Global exception filters (translate to envelope) | `src/filters/` |
| Global response interceptor | `src/interceptors/success-response.interceptor.ts` |
| Auth + role guards | `src/guards/` |
| Image / attachment validators | `src/validators/` |
| Custom exceptions | `src/exceptions/{auth,shared,authorization,file,...}/` |
| Generic enums (`SystemRole`, `LanguageCode`, etc.) | `src/constants/` |
| TypeORM migrations | `src/database/migrations/` |
| Audit log entity / repository / service | `src/modules/audit/` |
| Entity subscribers (auto-hash, audit context) | `src/entity-subscribers/` |
| i18n JSON files | `src/i18n/{en,ar,fr}/` |
| Mail templates (Handlebars) | `src/shared/mail/mail-templates/` |
| Generic services (S3, crypto, captcha, etc.) | `src/shared/services/` |
| `ApiConfigService` | `src/shared/services/api-config.service.ts` |
| Polyfills | `src/boilerplate.polyfill.ts` |

---

## See also

- [`conventions/coding-standards.md`](./conventions/coding-standards.md) — patterns to write code by
- [`guides/add-a-module.md`](./guides/add-a-module.md) — step-by-step module creation
- [`guides/exception-cookbook.md`](./guides/exception-cookbook.md) — which exception to throw when
- [`infrastructure/observability.md`](./infrastructure/observability.md) — Prometheus/Loki/Grafana runbook
- [`technologies.md`](./technologies.md) — full version table
