# Anti-Patterns & Code Review Checklist

Companion to [`coding-standards.md`](./coding-standards.md). Same rules, restructured for fast scanning during code review or AI-assisted refactoring.

---

## The hard "no" list

Code review *must* reject any of these.

| # | Pattern | Why it's wrong | The fix |
|---|---|---|---|
| 1 | `data: any` | Erases type safety; defeats the linter | `Record<string, unknown>`, a proper DTO, or an explicit union |
| 2 | `value as SomeType` | Lies to the compiler at the wrong layer | Narrow with type guards, or fetch with the right type. Only allowed at the `Uuid` boundary |
| 3 | `user!.id` (runtime) | Crashes at runtime instead of producing a proper error | `if (!user) throw new UserNotFoundException()` |
| 4 | Magic strings: `status === 'active'` | Typos are silent; refactors miss occurrences | Use enums from `src/constants/` |
| 5 | `throw new HttpException('Not found', 404)` | No i18n, no error code stability | Custom exception extending `BaseI18nException` |
| 6 | `user?.profile?.plan ?? 'free'` for control flow | Hides invalid state | Validate early, throw if invalid |
| 7 | Raw SQL via `query('SELECT ...')` | SQL injection risk + no schema sync | TypeORM `QueryBuilder` with parameterized queries |
| 8 | `return result;` (untyped) | Leaks internals into the API | `return entity.toDto()` or `return new SomeDto(entity)` |
| 9 | `// Check if user exists` | Comments rot; code should self-explain | Delete the comment. Comment only the *why*, never the *what* |
| 10 | `this.logger.log('fetching user...')` | Log noise that scales linearly with traffic | Log only errors and unexpected states |
| 11 | `process.env.DB_HOST` in business code | Bypasses validation, no typing | Inject `ApiConfigService`, use a typed getter |
| 12 | `this.dataSource.getRepository(Entity)` in services | Skips the repository abstraction | Inject the `Repository` class directly |
| 13 | Inline error message strings in `throw` | Same as #5 — no i18n, no stability | Custom exception with i18n key |
| 14 | `console.log(...)` anywhere | Bypasses Pino + Loki; no context | `this.logger.error/warn/info` with structured fields |
| 15 | `try { ... } catch (e) { /* swallow */ }` | Hides failures from the global filter | Let custom exceptions propagate |

**Allowed `!` exceptions:**
- DTO field declarations (`name!: string`) — `class-validator` guarantees them at runtime
- Entity column declarations — TypeORM populates them after fetch

**Allowed `as` exceptions:**
- `someString as Uuid` at request boundaries (controllers, validators)

---

## The "smell" list

These aren't always wrong, but they're worth flagging in review. Each one usually means there's a cleaner shape.

| # | Smell | What to do |
|---|---|---|
| 1 | Nesting deeper than 2 levels | Use early returns / guard clauses. If you need 3 levels, the function is doing too much |
| 2 | Function longer than ~20 lines | Split into named helpers. Long functions are hard to test and harder to review |
| 3 | "God" service: one service handling many responsibilities | Split by responsibility — `UserAuthService` vs `UserProfileService` |
| 4 | Optional `?` where `| null` is the right type | If the value can be `null` in the DB, type it `| null`, not just `?`. `?` means "may be missing from the object", which is different |
| 5 | Logging at `info` for routine operations | Drop to `debug`, or remove entirely. `info` is for significant business events, not every CRUD |
| 6 | Premature abstraction: a helper used in one place | Inline it. Extract only when the same logic appears in 3+ places |
| 7 | A repository method that returns a DTO | Repositories return entities. The service or controller calls `.toDto()` |
| 8 | Business logic in a controller | Move it to the service. Controllers map HTTP → service call → DTO |
| 9 | A service that imports another service that imports it back | Circular dependency. Break the cycle by extracting shared types or moving logic |
| 10 | An entity with `@OneToMany` to another module's entity | Entities belong to one module. If you need to navigate cross-module, do it via the repository |
| 11 | A `try/catch` that re-throws a different exception | Often means the upstream code should be throwing the right exception in the first place |
| 12 | A test that imports `process.env` or constructs `ApiConfigService` directly | Tests should use NestJS's `Test.createTestingModule` and override the provider |

---

## Code review checklist

Use this top-to-bottom on every PR. AI agents can scan it before generating the final diff.

### Type safety
- [ ] No `any` anywhere
- [ ] No `as` outside the `Uuid` boundary
- [ ] No `!` outside DTO field / entity column declarations
- [ ] No `@ts-ignore` / `@ts-expect-error` without an inline comment explaining why

### Error handling
- [ ] Every `throw` is a class extending `BaseI18nException`
- [ ] No inline error strings in `throw`
- [ ] No magic numbers for HTTP status — use `HttpStatus.*`
- [ ] All `error.*` i18n keys exist in `src/i18n/en/error.json`
- [ ] No `try/catch` that silently swallows errors

### Configuration
- [ ] No `process.env` reads outside `ApiConfigService` / `main.ts` bootstrap
- [ ] New env vars are added to `.env.example` *and* documented in `docs/guides/env-vars.md`

### Database
- [ ] All queries are parameterized (`:name` placeholders)
- [ ] Multi-table writes are wrapped in `@Transactional()`
- [ ] No `dataSource.getRepository()` in services — inject the repository class
- [ ] New entities have a corresponding migration generated and reviewed

### API surface
- [ ] Every endpoint has `@Protected(...)` (or `@PublicRoute(true)` if intentionally open)
- [ ] Every endpoint has `@HttpCode(...)`
- [ ] Every endpoint has `@ApiOkResponse({ type: ... })` (or `@ApiNoContentResponse()`)
- [ ] UUIDs come in via `@UUIDParam('...')`, not raw `@Param`
- [ ] Controllers return DTOs, never raw entities

### DTOs
- [ ] Input DTOs use custom field decorators (`@StringField`, `@UUIDField`, etc.) where they fit
- [ ] Validation messages use `i18nValidationMessage('validation.*')`
- [ ] Response DTOs extend `AbstractDto`
- [ ] Constructor mapping is explicit — no `Object.assign(this, entity)`

### Logging
- [ ] No `console.log` / `console.error`
- [ ] `PinoLogger` constructor calls `setContext(ClassName.name)`
- [ ] Logs at `info` level only for genuine business events
- [ ] Structured fields (`{ userId, ... }`) instead of string interpolation

### Style
- [ ] No comments explaining *what* the code does — only *why* if non-obvious
- [ ] No nesting deeper than 2 levels
- [ ] No functions longer than ~20 lines
- [ ] All imports use `.js` extensions (ESM)

### i18n
- [ ] User-facing messages reference i18n keys, not hardcoded strings
- [ ] New keys are added to all three locale files (`en`, `ar`, `fr`) — at minimum `en` is complete; `ar` / `fr` can fall back

### Tests
- [ ] New service methods have unit tests (or e2e tests if they touch HTTP)
- [ ] Tests don't read `process.env` directly
- [ ] Test fixtures don't leak between tests (clean DB / use transactions)

---

## See also

- [`coding-standards.md`](./coding-standards.md) — the explanatory canon for these rules
- [`api-responses.md`](./api-responses.md) — error envelope shape
- [`../guides/exception-cookbook.md`](../guides/exception-cookbook.md) — which exception to throw when
- [`../ai/prompts.md`](../ai/prompts.md) — Prompt 1 (review prompt) ingests this checklist
