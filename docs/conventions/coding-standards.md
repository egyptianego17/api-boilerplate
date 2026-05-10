# Backend Coding Standards

**Applies to:** All code under `src/`
**Stack:** NestJS 11, TypeScript 5.8, TypeORM 0.3.20, PostgreSQL, Redis + BullMQ, PinoLogger, ESM with `.js` import extensions

This is the canonical "how to write code in this repo" doc. The companion docs are:

- [`anti-patterns.md`](./anti-patterns.md) — quick-scan checklist for code review
- [`api-responses.md`](./api-responses.md) — response envelopes and error shapes
- [`naming.md`](./naming.md) — naming conventions

---

## 1. Zero-Tolerance Rules

Hard rules. Code that violates them must not be merged.

| Rule | Bad | Good |
|------|-----|------|
| No `any` type | `data: any` | `data: Record<string, unknown>` or a proper DTO |
| No `as` type assertions | `user as UserEntity` | Narrow with type guards or fetch with proper type |
| No `!` non-null assertions (runtime) | `user!.id` | `if (!user) throw new UserNotFoundException()` |
| No magic strings | `status: 'active'` | `status: SystemRole.USER` (use an enum from `src/constants/`) |
| No inline error messages | `throw new HttpException('Not found', 404)` | `throw new UserNotFoundException()` |
| No optional chaining for control flow | `user?.profile?.plan ?? 'free'` | Validate early, throw if missing |
| No raw SQL | `query('SELECT * FROM ...')` | TypeORM QueryBuilder with parameterized queries |
| No untyped API responses | `return result` | `return entity.toDto()` or `return new SomeDto(entity)` |
| No unnecessary comments | `// Check if user exists` | Code should be self-explaining. Only comment the *why*, never the *what* |
| No unnecessary logging | `this.logger.log('fetching user...')` | Log only errors and unexpected states |
| No `process.env` in services | `process.env.DB_HOST` | Inject `ApiConfigService`, read typed config values |
| No `dataSource.getRepository()` in services | `this.dataSource.getRepository(UserEntity)` | Inject repository classes directly |

**Exception for `!`:** Allowed on DTO field declarations (`name!: string`) where `class-validator` guarantees the value at runtime, and on entity column declarations where TypeORM populates the value.

**Exception for `as`:** Allowed at the `Uuid` branded-type boundary (e.g., `userId as Uuid` when accepting from a request).

**Exception for `?.`:** Allowed when the absence of a value is a valid domain state, not a bug to surface — e.g. recording an audit row in an unauthenticated flow, where `ContextProvider.getAuthUser()?.id ?? null` is the correct expression. The rule targets defensive chaining over data the code requires; it does not target legitimately-optional context lookups.

---

## 2. Self-Explaining Code — No Comments, Minimal Logs

Code must explain itself through naming, structure, and types.

### Comments

```typescript
// BAD — commenting the obvious
// Check if entity exists
if (!entity) {
  // Throw not found exception
  throw new UserNotFoundException();
}

// GOOD — code reads naturally
const user = await this.userRepository.findById(id);
if (!user) {
  throw new UserNotFoundException();
}

// GOOD — comment explains WHY, not WHAT
// BullMQ requires cron with timezone for proper DST handling
const scheduler = { pattern: cronExpression, tz: 'UTC' };
```

**When to comment:** Business logic not obvious from context, workarounds, regex patterns, hidden invariants.
**Never comment:** What a function does, what a variable holds, what a conditional checks, removed code.

### Logging

| Level | When | Example |
|-------|------|---------|
| `error` | Unexpected failures, external service errors | `this.logger.error({ err }, 'SendGrid send failed')` |
| `warn` | Suspicious states, recoverable issues | `this.logger.warn({ userId }, 'Duplicate verification attempt')` |
| `info` | Significant business events (rare) | `this.logger.info({ userId }, 'User registered successfully')` |
| `debug` | Almost never. Local dev only | `this.logger.debug({ ...inputs }, 'Computing hash')` |

**Never log:** Successful CRUD operations, request/response data, function entry/exit, variable values.

---

## 3. Module Structure

Each module follows this structure (mirrors `src/modules/user/`):

```
src/modules/{module}/
├── dtos/
│   ├── create-{entity}.dto.ts            # Create request DTO
│   ├── update-{entity}.dto.ts            # Update request DTO
│   ├── {entity}.dto.ts                   # Response DTO
│   └── {entity}-page-options.dto.ts      # Query filters (extends PageOptionsDto)
├── entities/
│   └── {module}.entity.ts                # TypeORM entity
├── repositories/
│   └── {module}.repository.ts            # Database queries
├── {module}.controller.ts                # REST API controller (thin)
├── {module}.service.ts                   # Business logic
└── {module}.module.ts                    # NestJS module definition
```

Exceptions live in a shared directory:

```
src/exceptions/
├── base-i18n.exception.ts                # Base class (extends HttpException, holds errorCode + i18nArgs)
├── auth/                                 # auth-related: invalid-credentials, two-factor-not-enabled, etc.
├── shared/                               # generic across modules: user-not-found, etc.
├── authorization/                        # role/permission errors
└── file/                                 # upload-related: file-too-large, file-invalid-type, etc.
```

---

## 4. Entities

### Entity Pattern

```typescript
// src/modules/user/entities/user.entity.ts
import type { Relation } from 'typeorm';
import { Column, Entity, Index, OneToOne, VirtualColumn } from 'typeorm';

import { AbstractEntity } from '../../../common/abstract.entity.js';
import { SystemRole } from '../../../constants/system-role.js';
import { UseDto } from '../../../decorators/use-dto.decorator.js';
import type { UserDtoOptions } from '../dtos/user.dto.js';
import { UserDto } from '../dtos/user.dto.js';
import type { UserSettingsEntity } from './user-settings.entity.js';

@Entity({ name: 'users' })
@UseDto(UserDto)
@Index('idx_user_email_unique', ['email'], { unique: true })
export class UserEntity extends AbstractEntity<UserDto, UserDtoOptions> {
  @Column({ type: 'varchar' })
  firstName!: string;

  @Column({ type: 'varchar' })
  lastName!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ nullable: true, type: 'varchar' })
  phone?: string | null;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  systemRole!: SystemRole;

  @VirtualColumn({
    query: (alias) =>
      `SELECT CONCAT(${alias}.first_name, ' ', ${alias}.last_name)`,
  })
  fullName!: string;

  @OneToOne('UserSettingsEntity', 'user')
  settings?: Relation<UserSettingsEntity>;
}
```

### Entity Rules

1. **Extend `AbstractEntity<Dto, Options?>`** — provides `id`, `createdAt`, `updatedAt`, and the `.toDto()` method.
2. **Use `@UseDto(SomeDto)`** to link the entity with its response DTO; this is what powers `entity.toDto()`.
3. **Use explicit table names in plural** (snake_case): `@Entity({ name: 'users' })`.
4. **Use string-based lazy relations** to prevent circular imports: `@OneToOne('UserSettingsEntity', 'user')`.
5. **Use `Relation<T>`** type wrapper for all relation properties.
6. **Use type-only imports** for related entities: `import type { UserSettingsEntity } from ...`.
7. **Use `!` for required fields**, `?` for optional/nullable.
8. **Nullable columns** use `string | null` type with `nullable: true`, not just `?`.
9. **`Uuid` is a branded type** (`string & { _uuidBrand: undefined }`) — cast with `as Uuid` only at request boundaries.
10. **Each entity belongs to ONE module** — never share entities across modules.
11. **Use `.js` extensions** in all import paths (ESM requirement).

---

## 5. Repositories

### Repository Pattern

```typescript
// src/modules/user/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import type { PageOptionsDto } from '../../../common/dto/page-options.dto.js';
import { UserEntity } from '../entities/user.entity.js';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource.createEntityManager());
  }

  private createBaseQueryBuilder(): SelectQueryBuilder<UserEntity> {
    return this.createQueryBuilder('user').select([
      'user.id',
      'user.firstName',
      'user.lastName',
      'user.email',
      'user.phone',
      'user.systemRole',
      'user.createdAt',
      'user.updatedAt',
    ]);
  }

  async findById(userId: Uuid): Promise<UserEntity | null> {
    return this.createBaseQueryBuilder()
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.createQueryBuilder('user')
      .select('1')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .limit(1)
      .getRawOne();

    return !!result;
  }

  findPaginated(pageOptions: PageOptionsDto): SelectQueryBuilder<UserEntity> {
    return this.createBaseQueryBuilder().orderBy(
      'user.createdAt',
      pageOptions.order,
    );
  }
}
```

### Repository Rules

1. **Extend `Repository<Entity>`** and inject `DataSource` directly.
2. **Never use `dataSource.getRepository()`** in services — always use repository classes.
3. **Always use parameterized queries**: `.where('user.id = :userId', { userId })`. Never string interpolation.
4. **Use `createBaseQueryBuilder()`** for consistent column selection across find methods.
5. **Return `Entity | null`** from find methods — let the service throw exceptions.
6. **Pagination uses `SelectQueryBuilder.paginate()`** from the boilerplate polyfill in `src/boilerplate.polyfill.ts`.

---

## 6. Services

### Service Pattern

```typescript
// src/modules/user/user.service.ts (excerpt)
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { IncorrectPasswordException } from '../../exceptions/auth/incorrect-password.exception.js';
import { UserNotFoundException } from '../../exceptions/shared/user-not-found.exception.js';
import { validateHash } from '../../common/utils.js';
import type { ChangePasswordDto } from './dtos/change-password.dto.js';
import { UserRepository } from './repositories/user.repository.js';

@Injectable()
export class UserService {
  constructor(
    private readonly logger: PinoLogger,
    private userRepository: UserRepository,
  ) {
    this.logger.setContext(UserService.name);
  }

  async changePassword(userId: Uuid, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UserNotFoundException();
    }

    const isCurrentPasswordValid = await validateHash(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new IncorrectPasswordException();
    }

    user.password = dto.newPassword;
    await this.userRepository.save(user);
  }
}
```

### Service Rules

1. **Use `@Injectable()`**.
2. **Inject repository classes**, not raw TypeORM repositories.
3. **Mark dependencies as `private`** (or `private readonly` for stateless services like `PinoLogger`).
4. **Use `PinoLogger`** with `this.logger.setContext(ClassName.name)` in the constructor.
5. **Validate first, throw specific exceptions.** Never swallow with default values.
6. **Return entities from internal methods** — the controller calls `.toDto()` at the boundary.
7. **Use `@Transactional()`** (from `typeorm-transactional`) for multi-step write operations (see §12).
8. **No try/catch for expected errors** — let custom exceptions propagate to the global filter.

---

## 7. Controllers

### Controller Pattern

```typescript
// src/modules/user/user.controller.ts (excerpt)
import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthUser } from '../../decorators/auth-user.decorator.js';
import { Protected } from '../../decorators/protected.decorator.js';
import { UpdateProfileDto } from './dtos/update-profile.dto.js';
import { UserDto } from './dtos/user.dto.js';
import type { UserEntity } from './entities/user.entity.js';
import { UserService } from './user.service.js';

@Controller('users')
@ApiTags('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto, description: 'Get current user profile' })
  async getCurrentUser(@AuthUser() user: UserEntity): Promise<UserDto> {
    return this.userService.getUserProfile(user.id);
  }

  @Patch('me')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto, description: 'Update current user profile' })
  async updateProfile(
    @AuthUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.userService.updateProfile(user.id, dto);
  }
}
```

### Controller Rules

1. **Use `@Protected()`** on every protected endpoint. Pass `{ systemRole: SystemRole.ADMIN }` for admin-only routes.
2. **Always specify `@HttpCode()`** on every endpoint.
3. **Always specify `@ApiOkResponse()`** with a concrete response type (Swagger needs it).
4. **Use `@UUIDParam('id')`** (from `src/decorators/http.decorators.ts`) for UUID path parameters — it validates UUID v4 at the request boundary.
5. **Use `@AuthUser() user: UserEntity`** to get the authenticated user.
6. **Keep controllers thin** — validate input → call service → return DTO. No business logic.
7. **No try/catch** — let `HttpExceptionFilter` (in `src/filters/`) handle all errors.

### REST API status codes

```typescript
// Resource creation
@Post()    @HttpCode(HttpStatus.CREATED)

// Retrieval
@Get()     @HttpCode(HttpStatus.OK)        // list
@Get(':id') @HttpCode(HttpStatus.OK)       // single

// Partial update
@Patch(':id') @HttpCode(HttpStatus.OK)

// Deletion
@Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
```

**URL conventions:** plural nouns (`/users`, `/uploads`), no verbs in URLs.

---

## 8. DTOs

### Input DTOs (Create / Update)

Use the project's custom field decorators from `src/decorators/field.decorators.ts` — they bundle validation + Swagger docs + transforms.

```typescript
// src/modules/user/dtos/update-profile.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(160)
  @IsOptional()
  bio?: string;
}
```

### Response DTOs

```typescript
// src/modules/user/dtos/user.dto.ts (excerpt)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { AbstractDto } from '../../../common/dto/abstract.dto.js';
import type { UserEntity } from '../entities/user.entity.js';

export type UserDtoOptions = Partial<{ isActive: boolean }>;

export class UserDto extends AbstractDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  firstName!: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  lastName!: string;

  @ApiProperty()
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsOptional()
  phone?: string | null;

  @ApiProperty({ description: 'Two-factor authentication status' })
  @IsBoolean({ message: i18nValidationMessage('validation.isBoolean') })
  twoFactorEnabled!: boolean;

  constructor(user: UserEntity, options?: UserDtoOptions) {
    super(user);
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.phone = user.phone;
    this.twoFactorEnabled = user.twoFactorEnabled;
  }
}
```

### DTO Rules

1. **Use custom field decorators** (`@StringField`, `@UUIDField`, `@EnumField`, `@PasswordField`, etc.) when they fit — they combine validation + Swagger + transforms in one annotation.
2. **Wire validation messages through i18n**: `i18nValidationMessage('validation.isString')`. Validation strings live in `src/i18n/{locale}/validation.json`.
3. **Response DTOs extend `AbstractDto`** — provides `id`, `createdAt`, `updatedAt`, and language-aware translation handling.
4. **Use `!` for required fields** (class-validator guarantees them at runtime).
5. **Use `?` for optional fields** on input DTOs.
6. **Nullable fields** declare `string | null` with `{ nullable: true }` on `@ApiPropertyOptional`.
7. **Response DTOs use constructor-based mapping** from the entity. Don't auto-spread.
8. **Never return raw entities** from controllers — always `.toDto()` (or `new SomeDto(entity)`).

---

## 9. Exceptions

### Exception Pattern

```typescript
// src/exceptions/shared/user-not-found.exception.ts
import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class UserNotFoundException extends BaseI18nException {
  constructor() {
    super('error.userNotFound', HttpStatus.NOT_FOUND);
  }
}
```

`BaseI18nException` extends NestJS's `HttpException` and stores the `errorCode` plus optional `i18nArgs`. The global `HttpExceptionFilter` (`src/filters/http-exception.filter.ts`) translates the error code via `nestjs-i18n` before sending the response.

### Exception Rules

1. **All custom exceptions extend `BaseI18nException`**, never raw `HttpException` or NestJS sub-classes.
2. **Use i18n keys** for error messages: `'error.userNotFound'`. The key must exist in `src/i18n/{locale}/error.json`.
3. **Pick the right HTTP status** — see [`../guides/exception-cookbook.md`](../guides/exception-cookbook.md).
4. **Naming convention:** `{Entity}{Action}Exception` (e.g., `UserNotFoundException`, `EmailAlreadyRegisteredException`).
5. **Folder layout:**
   - `src/exceptions/auth/` — auth-flow errors
   - `src/exceptions/shared/` — generic across modules
   - `src/exceptions/file/` — upload-related
   - `src/exceptions/authorization/` — role/permission errors
   - `src/exceptions/{module}/` — domain-specific (create when needed)

---

## 10. Configuration

### ApiConfigService

All environment variables flow through `ApiConfigService` (path: `src/shared/services/api-config.service.ts`). **Never** read `process.env` directly in services, controllers, or DTOs.

```typescript
// BAD
const dbHost = process.env.DB_HOST;

// GOOD
constructor(private configService: ApiConfigService) {}
const { host } = this.configService.postgresConfig;
```

### Adding a new env var

1. Add it to `.env.example` with a comment explaining its purpose.
2. Add a typed getter to `ApiConfigService` (use `this.getString(key, { optional: true })` for optional values).
3. Inject `ApiConfigService` where needed and read via the getter.
4. Document the var in [`../guides/env-vars.md`](../guides/env-vars.md).

---

## 11. Module Registration

```typescript
// src/modules/user/user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../../shared/mail/mail.module.js';
import { UserEntity } from './entities/user.entity.js';
import { UserSettingsEntity } from './entities/user-settings.entity.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserSettingsRepository } from './repositories/user-settings.repository.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity]),
    MailModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, UserSettingsRepository],
  exports: [UserService, UserRepository, UserSettingsRepository],
})
export class UserModule {}
```

### Module Rules

1. **Register entities** in `TypeOrmModule.forFeature([...])`.
2. **Register repositories** in `providers` (not via `TypeOrmModule.forFeature` — those provide raw TypeORM repos, which we don't want).
3. **Export services and repositories** that other modules consume.
4. **Use `forRootAsync`** with `SharedModule` + `ApiConfigService` for async-config modules (see `BullModule`/`TypeOrmModule`/`I18nModule` in `src/app.module.ts`).
5. **Register the module** in `src/app.module.ts` `imports`.

---

## 12. Transactions

Use `@Transactional()` from `typeorm-transactional` for any operation that writes to multiple tables atomically.

```typescript
// src/modules/user/user.service.ts (excerpt — createUser)
import { Transactional } from 'typeorm-transactional';

@Transactional()
async createUser(
  userRegisterDto: UserRegisterDto,
  file?: Reference<IFile>,
): Promise<UserEntity> {
  const user = this.userRepository.create(userRegisterDto);

  if (file) {
    user.avatar = await this.awsS3Service.uploadImageWithVariants(file);
  }

  await this.userRepository.save(user);

  user.settings = await this.createSettings(user.id, {
    isEmailVerified: false,
    isPhoneVerified: false,
  });

  return user;
}
```

Both `userRepository.save()` and `userSettingsRepository.createSettings()` participate in the same transaction; if either throws, both roll back.

The transactional context is wired up in `src/main.ts` via `initializeTransactionalContext()` — don't disable it.

---

## 13. Mutations on audited tables

Tables attached to the audit log via `SELECT attach_audit_log(...)` capture every INSERT / UPDATE / DELETE in `audit_log`. The trigger fires regardless of how the change is made — but actor metadata (`changed_by`, `request_id`) is only populated when the change goes through a TypeORM `EntitySubscriber` hook.

### Coverage by code path

| Path | Audit row | `changed_by` populated |
|---|---|---|
| `Repository.save(entity)` | yes | yes |
| `Repository.remove(entity)` | yes | yes |
| `Repository.update(criteria, partial)` | yes | **no** |
| `Repository.delete(criteria)` | yes | **no** |
| `QueryBuilder.update().execute()` | yes | **no** |
| Raw SQL via `dataSource.query()` | yes | **no** |
| Migrations / ops sessions | yes | **no** |

### Rule

For **actor-driven** mutations on audited tables (a user editing their own row, an admin acting on a record), use entity-instance methods:

```typescript
// GOOD — fires beforeUpdate, audit row has changed_by
const user = await this.userRepository.findOne({ where: { id } });
user.firstName = newName;
await this.userRepository.save(user);

// BAD for actor-driven mutation — bypasses subscriber
await this.userRepository.update({ id }, { firstName: newName });
```

For **non-actor** mutations (token rotations, scheduled cleanup, system migrations, bulk admin ops), criteria-based methods are fine — the audit row will exist with `changed_by IS NULL`, which is the correct semantics:

```typescript
// GOOD — non-actor mutation, NULL changed_by is correct
await this.userRepository.update(
  { passwordResetExpires: LessThan(new Date()) },
  { passwordResetToken: null, passwordResetExpires: null },
);
```

### Business events

For high-level actions that should appear in the audit timeline alongside row changes, emit via `AuditService.record(...)`:

```typescript
await this.auditService.record(
  'posts.published',
  { title: post.title },
  { objectId: post.id },
);
```

Naming: `<namespace>.<verb_past_tense>`. Payload should be small and non-sensitive (the redaction pipeline does NOT apply to event payloads). `record(...)` is fire-and-forget by design: failures are logged and swallowed so audit problems can't break the calling auth/business flow — don't wrap it in a `try/catch` and don't depend on its success. Recipe: [`../guides/add-an-audited-entity.md`](../guides/add-an-audited-entity.md).

---

## 14. BullMQ Jobs

For background processing, use BullMQ with the established patterns:

- **Queue registration:** in the module via `@nestjs/bullmq` (`BullModule.registerQueueAsync`).
- **Producer:** inject `@InjectQueue('queue-name') private queue: Queue` and call `this.queue.add(...)`.
- **Processor:** `@Processor('queue-name')` class extending `WorkerHost` with a `process(job)` method.
- **Repeatable / scheduled jobs:** register in `onModuleInit()` using `queue.upsertJobScheduler(...)`. Don't use the deprecated `queue.add({ repeat: ... })` API.
- **Idempotency:** always check for duplicate executions before processing (DB count check or unique constraint).
- **Metrics:** add the queue name to `MONITORED_QUEUES` in `src/modules/metrics/constants/monitored-queues.constants.ts` so the Grafana dashboard shows it.

Full recipe: [`../guides/add-a-queue.md`](../guides/add-a-queue.md).

---

## See also

- [`anti-patterns.md`](./anti-patterns.md) — same rules in checklist form, for code review
- [`api-responses.md`](./api-responses.md) — response/error envelope shapes
- [`naming.md`](./naming.md) — A/HC/LC naming pattern, action verbs, prefixes
- [`../guides/add-a-module.md`](../guides/add-a-module.md) — step-by-step module creation
- [`../guides/exception-cookbook.md`](../guides/exception-cookbook.md) — which exception to throw when
- [`../guides/env-vars.md`](../guides/env-vars.md) — env var reference
- [`../architecture.md`](../architecture.md) — module map and request lifecycle
