# api-boilerplate

A production-grade NestJS 11 backend boilerplate with auth, observability, queues, i18n, and uploads pre-wired.

## Stack

- **Runtime:** Node.js 22+, TypeScript 5.8 (ESM with `.js` import extensions), SWC compiler
- **Framework:** NestJS 11
- **Database:** PostgreSQL 15 + TypeORM 0.3.20 (snake_case naming, `typeorm-transactional`)
- **Queues:** BullMQ on Redis 7
- **Auth:** JWT (RS256) access + refresh tokens, password reset, email verification, 2FA (TOTP), Google OAuth
- **File storage:** AWS S3 / MinIO via `@aws-sdk/client-s3` + `sharp` for image variants
- **Mail:** SendGrid + Handlebars templates (activation, reset password, confirm new email)
- **Observability:** Pino + `pino-loki`, Prometheus metrics (`/metrics`), Loki + Grafana, AlertManager
- **i18n:** `nestjs-i18n` with `en` / `ar` / `fr` (multi-locale scaffolding)
- **Validation:** `class-validator` + `class-transformer`, custom field decorators (`@StringField`, `@UUIDField`, etc.)
- **Rate limiting:** `@nestjs/throttler` (3-tier: 1s / 10s / 60s)
- **Captcha:** Cloudflare Turnstile
- **Tooling:** Biome, ESLint 9 (sonarjs, unicorn, simple-import-sort, etc.), Prettier, Husky, commitlint, release-it
- **Testing:** Jest + ts-jest (unit + e2e), k6 load tests (smoke / ramp / sustained / spike / stress)

## Quick start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: generate JWT_PRIVATE_KEY/JWT_PUBLIC_KEY (RS256) and set ENCRYPTION_KEY (32 bytes hex)

# 2. Bring up infra (Postgres, Redis, MinIO, Prometheus, Loki, Grafana, AlertManager, exporters)
docker compose -f docker-compose-local.yml up -d

# 3. Install dependencies
npm install

# 4. Run migrations (none ship with the boilerplate; add your own)
npm run migration:run

# 5. Start the API in watch mode
npm run start:dev
```

The API listens on `PORT` (default `3000`). Swagger UI is at `http://localhost:3000/documentation`.

## Local services

When `docker-compose-local.yml` is up:

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/documentation |
| Health | http://localhost:3000/health |
| Metrics | http://localhost:3000/metrics |
| PgAdmin | http://localhost:9090 |
| MinIO console | http://localhost:9001 |
| Prometheus | http://localhost:9092 |
| Grafana | http://localhost:3200 |
| AlertManager | http://localhost:9095 |

## What's included out of the box

Generic, reusable modules pre-wired into `src/app.module.ts`:

- `auth` — register, login, refresh, password reset, email verify, 2FA enable/disable/verify, recovery codes
- `auth-google` — Google OAuth
- `user` — profile (`/users/me`), avatar upload/delete, settings, change password, request/confirm email change
- `upload` — generic file uploads with image validation
- `health-checker` — `/health` (DB + Redis)
- `metrics` — Prometheus exporter at `/metrics` (HTTP RED, BullMQ gauge/duration/failures, user registrations/logins)

Reusable scaffolding under `src/`:

- `common/` — `AbstractEntity<Dto>`, `AbstractDto`, `PageDto`, `PageMetaDto`, `PageOptionsDto`, error/response DTOs
- `decorators/` — `@StringField`, `@NumberField`, `@UUIDField`, `@EnumField`, `@PasswordField`, `@Protected({ systemRole })`, `@AuthUser`, `@PublicRoute`, `@UUIDParam`, transform/validator helpers, file/page Swagger wrappers
- `filters/` — i18n exception filter, validation filter, query-failed filter
- `interceptors/` — standardized success-response envelope, auth-user CLS interceptor
- `guards/` — JWT auth, system-role authorization
- `validators/` — `ImageFileValidationPipe`, `AttachmentFileValidationPipe`
- `providers/` — `ContextProvider` (CLS-based request context), `GeneratorProvider`
- `boilerplate.polyfill.ts` — `Array.toDtos`, `Array.toPageDto`, `SelectQueryBuilder.searchByString`, `SelectQueryBuilder.paginate`
- `snake-naming.strategy.ts` — TypeORM camelCase ↔ snake_case
- Branded `Uuid` type in `src/types.ts`

## Commands

```bash
# Dev / build
npm run start:dev          # nest start --watch
npm run build:prod         # nest build (SWC + tsc type-check)
npm run start:prod         # node dist/main.js

# Tests
npm test                   # Jest
npm run test:cov           # with coverage
npm run test:e2e           # e2e suite

# Lint / format
npm run lint               # eslint
npm run lint:fix
npm run format             # prettier

# Migrations (TypeORM)
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:create   -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert

# Load tests (require k6 installed)
npm run load:smoke         # smoke
npm run load:ramp          # ramp-up
npm run load:sustained     # constant load
npm run load:spike         # sudden spike
npm run load:stress        # push to failure
```

## Project structure

```
src/
├── app.module.ts                    # wires up all modules
├── main.ts                          # bootstrap (helmet, compression, CORS, global filters/interceptors)
├── setup-swagger.ts                 # Swagger UI at /documentation
├── boilerplate.polyfill.ts          # Array + SelectQueryBuilder polyfills
├── snake-naming.strategy.ts
├── types.ts                         # branded Uuid type
├── common/                          # AbstractEntity, AbstractDto, page DTOs, utils
├── config/
├── constants/                       # SystemRole, LanguageCode, AuthTokens, image-variants, order
├── database/migrations/             # ships empty; add your own
├── decorators/                      # custom field/auth/swagger decorators
├── entity-subscribers/              # password auto-hashing
├── exceptions/                      # base i18n exception + auth/file/shared/authorization subfolders
├── filters/                         # global exception filters
├── generated/                       # i18n.generated.ts (regenerated by nestjs-i18n)
├── guards/                          # JWT + system-role guards
├── i18n/                            # en/ ar/ fr/ JSON translations
├── interceptors/                    # success-response, auth-user CLS
├── interfaces/                      # IFile, IApiFile
├── modules/
│   ├── auth/                        # JWT + refresh + 2FA + password reset + email verify
│   ├── auth-google/                 # Google OAuth
│   ├── user/                        # profile, avatar, settings, password, email change
│   ├── upload/                      # generic file uploads
│   ├── health-checker/              # /health
│   └── metrics/                     # /metrics + BullMQ queue gauge
├── providers/                       # ContextProvider, GeneratorProvider
├── shared/
│   ├── logger/                      # Pino + pino-loki
│   ├── mail/                        # SendGrid + Handlebars (activation, reset, confirm-new-email)
│   └── services/                    # ApiConfigService, AwsS3Service, CryptoService, ImageProcessing, etc.
├── types/
└── validators/                      # image / attachment file validation pipes

monitoring/                          # Prometheus, Loki, AlertManager configs + Grafana dashboards
load-tests/                          # k6 scenarios + helpers
docs/                                # backend coding standards, naming, API response, AI prompts
```

## Conventions

Start at [`docs/README.md`](./docs/README.md) for the full index. The most important docs:

- [`docs/architecture.md`](./docs/architecture.md) — module map, request lifecycle, design constraints.
- [`docs/conventions/coding-standards.md`](./docs/conventions/coding-standards.md) — entity / repository / service / controller / DTO patterns, transactions, zero-tolerance rules.
- [`docs/conventions/anti-patterns.md`](./docs/conventions/anti-patterns.md) — code review checklist (forbidden patterns + smells).
- [`docs/conventions/api-responses.md`](./docs/conventions/api-responses.md) — response / error envelope contract.
- [`docs/conventions/naming.md`](./docs/conventions/naming.md) — naming conventions.
- [`docs/guides/add-a-module.md`](./docs/guides/add-a-module.md) — step-by-step recipe for new feature modules.
- [`docs/guides/exception-cookbook.md`](./docs/guides/exception-cookbook.md) — which exception to throw when.
- [`docs/ai/prompts.md`](./docs/ai/prompts.md) — review + feature-dev prompts for Claude / Cursor.

## License

MIT
