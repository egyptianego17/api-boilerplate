# Environment Variables Reference

Every environment variable the boilerplate reads, where it's consumed, and what breaks if it's missing.

---

## Reading variables

**Never read `process.env` in business code.** All env access flows through [`ApiConfigService`](../../src/shared/services/api-config.service.ts), which provides typed getters with optional defaults.

```typescript
// BAD
const dbHost = process.env.DB_HOST;

// GOOD
constructor(private configService: ApiConfigService) {}
const { host } = this.configService.postgresConfig;
```

The class supports three call patterns:
- `this.getString(key)` — required, throws if missing
- `this.getString(key, { defaultValue: 'fallback' })` — optional with default
- `this.getString(key, { optional: true })` — optional, returns `undefined`

There are typed counterparts: `getNumber`, `getBoolean`, `getDuration` (parses strings like `1m`, `30s` via `parse-duration`).

---

## Variable reference

Required vars throw at boot if absent. Optional vars are silently skipped or use a hard-coded default.

### Application

| Var | Required | Default | Consumed in | Notes |
|---|---|---|---|---|
| `NODE_ENV` | yes | — | `ApiConfigService.nodeEnv`, gates `isDevelopment` / `isProduction` / `isTest` | `development` / `production` / `test` |
| `PORT` | yes | — | `appConfig.port`, `main.ts` listen() | Defaults to `3000` in `.env.example` |
| `FALLBACK_LANGUAGE` | yes | — | `I18nModule` `forRootAsync` | One of `en` / `ar` / `fr` |
| `LOG_LEVEL` | no | `debug` (dev) / `info` (prod) | `logLevel` getter | `error` / `warn` / `info` / `debug` |
| `ENABLE_DOCUMENTATION` | yes | — | `documentationEnabled`, gates Swagger UI | `true` / `false` |
| `ENABLE_ORM_LOGS` | yes | — | `postgresConfig.logging` | Verbose TypeORM SQL logs |
| `API_VERSION` | no | — | docs only (Swagger title) | Cosmetic |
| `CORS_ORIGINS` | no | `http://localhost:3000` | `main.ts` CORS bootstrap | Comma-separated list |

### JWT (RS256)

| Var | Required | Consumed in |
|---|---|---|
| `JWT_PRIVATE_KEY` | yes | `authConfig.privateKey`, `JwtModule.registerAsync` |
| `JWT_PUBLIC_KEY` | yes | `authConfig.publicKey`, `JwtModule.registerAsync` |
| `JWT_EXPIRATION_TIME` | yes | `authConfig.jwtExpirationTime`, signed token TTL (seconds) |
| `ENCRYPTION_KEY` | yes | `authConfig.encryptionKey`, used to encrypt 2FA TOTP secrets at rest |

`ENCRYPTION_KEY` must be exactly **32 bytes / 64 hex chars**; `ApiConfigService.authConfig` throws at boot if not. Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`, use `\n` as a line separator inside the env value:
```bash
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem
```

### Database (PostgreSQL)

| Var | Required | Consumed in |
|---|---|---|
| `DB_TYPE` | yes | `.env.example` only — `postgresConfig` hardcodes `'postgres'` |
| `DB_HOST` | yes | `postgresConfig.host`, `postgresConnectionString` |
| `DB_PORT` | yes | `postgresConfig.port` |
| `DB_USERNAME` | yes | `postgresConfig.username` |
| `DB_PASSWORD` | yes | `postgresConfig.password` |
| `DB_DATABASE` | yes | `postgresConfig.database` |
| `DB_SYNCHRONIZE` | yes | `postgresConfig.synchronize` (and `migrationsRun = !synchronize`). **Set to `false` in production** |

### S3 / MinIO

| Var | Required | Consumed in |
|---|---|---|
| `AWS_S3_ENDPOINT` | no | `awsS3Config.endpoint` (set for MinIO local dev) |
| `AWS_S3_PUBLIC_URL` | no | `awsS3Config.publicUrl` (used to build signed-URL prefixes) |
| `AWS_S3_ACCESS_KEY_ID` | no | `awsS3Config.accessKeyId` (omit on EC2 + IAM role) |
| `AWS_S3_SECRET_ACCESS_KEY` | no | `awsS3Config.secretAccessKey` |
| `AWS_S3_BUCKET_REGION` | yes | `awsS3Config.bucketRegion` |
| `AWS_S3_API_VERSION` | yes | `awsS3Config.bucketApiVersion` |
| `AWS_S3_BUCKET_NAME` | yes | `awsS3Config.bucketName` |
| `AWS_S3_FORCE_PATH_STYLE` | yes | `awsS3Config.forcePathStyle` (`true` for MinIO, `false` for AWS S3) |
| `MINIO_ROOT_USER` | no | docker-compose only |
| `MINIO_ROOT_PASSWORD` | no | docker-compose only |

### Redis + BullMQ

| Var | Required | Consumed in |
|---|---|---|
| `REDIS_HOST` | yes | `redisConfig.host`, BullMQ `connection`, custom Redis health indicator |
| `REDIS_PORT` | yes | `redisConfig.port` |
| `REDIS_PASSWORD` | no | `redisConfig.password` |
| `REDIS_CACHE_ENABLED` | no | docs only — not currently read |
| `BULLMQ_DEFAULT_ATTEMPTS` | yes | `bullmqConfig.defaultAttempts`, default job retry count (defaults to 3) |
| `BULLMQ_BACKOFF_DELAY` | yes | `bullmqConfig.backoffDelay`, exponential backoff base (ms) |

### Mail (SendGrid)

| Var | Required | Consumed in |
|---|---|---|
| `SENDGRID_API_KEY` | yes | `mailConfig.sendgridApiKey`, `MailerService` constructor |
| `MAIL_DEFAULT_EMAIL` | yes | `mailConfig.defaultEmail`, default `From` |
| `MAIL_DEFAULT_NAME` | no (default `API Boilerplate`) | `mailConfig.defaultName` |
| `APP_NAME` | no (default `API Boilerplate`) | `mailConfig.appName`, `twoFactorConfig.appName` |
| `FRONTEND_DOMAIN` | yes | `mailConfig.frontendDomain`, used to build action URLs in email templates |

When `SENDGRID_API_KEY` is the placeholder `your_sendgrid_api_key_here`, the SendGrid SDK warns "API key does not start with 'SG.'". Mail sends fail until you set a real key.

### Two-Factor Authentication

| Var | Required | Default | Consumed in |
|---|---|---|---|
| `TWO_FACTOR_ISSUER` | no | `API Boilerplate` | `twoFactorConfig.issuer`, shown in authenticator apps |
| `TWO_FACTOR_CODE_DIGITS` | no | `6` | `twoFactorConfig.codeDigits` |
| `TWO_FACTOR_VALIDITY_WINDOW` | no | `1` | `twoFactorConfig.codeValidityWindow`, ± steps of 30 s |
| `RECOVERY_CODES_COUNT` | no | `10` | `twoFactorConfig.recoveryCodesCount` |

### Google OAuth

| Var | Required | Consumed in |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes (for OAuth flow) | `auth-google.config.ts` |
| `GOOGLE_CLIENT_SECRET` | yes (for OAuth flow) | `auth-google.config.ts` |

If unset, `/v1/auth/google/*` routes return 500 when called.

### Throttling

| Var | Required | Consumed in |
|---|---|---|
| `THROTTLER_TTL` | yes | `throttlerConfigs.ttl` (parsed as duration, e.g. `1m`) |
| `THROTTLER_LIMIT` | yes | `throttlerConfigs.limit` |

Note: `app.module.ts` configures three named throttlers (`short` / `medium` / `long`) directly with hard-coded values. The env-driven `throttlerConfigs` getter is currently only used for ad-hoc tweaks — the live config is the literal in `ThrottlerModule.forRoot`.

### Observability

| Var | Required | Default | Consumed in |
|---|---|---|---|
| `LOKI_URL` | no | undefined | `lokiUrl` getter; when set, Pino transports logs to Loki via `pino-loki` |
| `ALERT_EMAIL_TO` | no | — | docker-compose / AlertManager config |
| `GRAFANA_ADMIN_PASSWORD` | no | `admin` | docker-compose only |

### Cloudflare Turnstile (captcha)

| Var | Required | Consumed in |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | yes (if Turnstile is wired into a flow) | `TurnstileService` |

### NATS (optional microservice transport)

| Var | Required | Consumed in |
|---|---|---|
| `NATS_ENABLED` | yes | `natsEnabled` getter; `main.ts` skips microservice startup when `false` |
| `NATS_HOST` | only if enabled | `natsConfig.host` |
| `NATS_PORT` | only if enabled | `natsConfig.port` |
| `TRANSPORT_PORT` | only if enabled | docs only |

### PgAdmin (docker-compose-local only)

| Var | Required | Consumed in |
|---|---|---|
| `PGADMIN_DEFAULT_EMAIL` | no | docker-compose-local.yml |
| `PGADMIN_DEFAULT_PASSWORD` | no | docker-compose-local.yml |

---

## Adding a new env var

1. **Add it to `.env.example`** with a comment explaining its purpose. Group it into the right section (`#== APP`, `#== Mail`, etc.).
2. **Add a typed getter to `ApiConfigService`** at `src/shared/services/api-config.service.ts`. Choose `getString` / `getNumber` / `getBoolean` / `getDuration` and either `defaultValue` or `optional` based on whether it's required.
3. **Inject `ApiConfigService`** in the consumer and read via the getter.
4. **Document it here** — append a row to the appropriate table.

If the var maps to a config object passed to a Nest module's `forRootAsync` (e.g., `BullModule`, `TypeOrmModule`, `I18nModule`), the wiring lives in `src/app.module.ts`.

---

## See also

- [`development.md`](./development.md) — local-dev setup walkthrough
- [`../infrastructure/deployment.md`](../infrastructure/deployment.md) — production env-var checklist
- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) §10 — no `process.env` in business code
