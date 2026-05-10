# AI Development Prompts

Two prompts for AI-assisted backend development. Use them with Claude, Cursor, or any AI coding tool.

---

## Prompt 1: Backend Code Review

```
You are reviewing backend code in src/. Read and enforce the coding standards at:
docs/conventions/coding-standards.md

Also read the project standards:
- docs/conventions/naming.md
- docs/conventions/api-responses.md

REFERENCE FILES (examples of correct patterns):
- Controller: src/modules/user/user.controller.ts (thin, @Protected, @HttpCode, @ApiOkResponse, @UUIDParam, @AuthUser)
- Service: src/modules/user/user.service.ts (PinoLogger with setContext, validate-first pattern, returns entities)
- Repository: src/modules/user/repositories/user.repository.ts (extends Repository<Entity>, injects DataSource, createBaseQueryBuilder)
- Entity: src/modules/user/entities/user.entity.ts (extends AbstractEntity, @UseDto, Relation<T>)
- DTO input: src/modules/user/dtos/update-profile.dto.ts (custom validators, i18nValidationMessage)
- DTO response: src/modules/user/dtos/user.dto.ts (extends AbstractDto, constructor mapping from entity)
- Exception: src/exceptions/shared/user-not-found.exception.ts (extends NestJS exception, i18n key)
- Module: src/modules/user/user.module.ts (TypeOrmModule.forFeature, registers repository in providers)

CHECK every file provided for:
1. No `any` -- use proper types or Record<string, unknown>
2. No `as` assertions -- except at type-system boundaries (Uuid branded type)
3. No `!` assertions -- except on DTO fields and entity columns
4. No magic strings -- use enums from src/constants/
5. No inline errors -- every throw must be a custom exception from src/exceptions/
6. No process.env -- all env vars must go through ApiConfigService
7. No dataSource.getRepository() in services -- inject repository classes
8. No unnecessary comments -- only comment the WHY, never the WHAT
9. No unnecessary logging -- log only errors via PinoLogger
10. Custom field decorators used for all DTO fields (@StringField, @UUIDField, @EnumField, etc.)
11. Controllers: @Protected + @HttpCode + @ApiOkResponse on every endpoint, no business logic
12. Services: validate first, throw specific exceptions, use PinoLogger with setContext
13. Repositories: extend Repository<Entity>, inject DataSource, parameterized queries only
14. Entities: extend AbstractEntity, @UseDto, string-based relations, Relation<T> type
15. All imports use .js extension (ESM)
16. @Transactional() on multi-table write operations

ALSO CHECK for readability and scalability:
- No optional (?) fields where a value is always expected -- use `| null` for nullable
- No deep nesting (max 2 levels) -- use early returns
- No long functions (>20 lines) -- split into smaller functions
- No god services -- one responsibility per service
- Precise naming -- `findById` not `getData`, `UserNotFoundException` not `NotFoundException`
- Fail loudly -- throw on invalid state, never silently return defaults
- No premature abstractions -- don't create helpers for logic used only once

Report issues with file:line and what to fix.
```

---

## Prompt 2: Backend New Feature Development

```
You are building a new module in src/modules/. Follow the coding standards at:
docs/conventions/coding-standards.md

REFERENCE THE EXISTING USER MODULE as your template:
- Module: src/modules/user/user.module.ts
- Controller: src/modules/user/user.controller.ts
- Service: src/modules/user/user.service.ts
- Repository: src/modules/user/repositories/user.repository.ts
- Entity: src/modules/user/entities/user.entity.ts
- DTOs: src/modules/user/dtos/*.ts
- Exceptions: src/exceptions/shared/user-not-found.exception.ts and src/exceptions/auth/*.ts

FOR EVERY NEW MODULE you MUST create:
1. Module file: {module}.module.ts -- imports TypeOrmModule.forFeature([Entity]), registers repository
2. Controller: {module}.controller.ts -- @ApiTags, @Protected, @HttpCode, @ApiOkResponse on every endpoint
3. Service: {module}.service.ts -- inject repositories (not dataSource.getRepository), PinoLogger with setContext
4. Repository: {module}.repository.ts -- extend Repository<Entity>, inject DataSource, createBaseQueryBuilder
5. Entity: {module}.entity.ts -- extend AbstractEntity, @UseDto, @Entity({ name: 'table_name' }), string-based relations
6. DTOs in dtos/ -- use custom field decorators (@StringField, @UUIDField, etc.), response DTOs extend AbstractDto
7. Exceptions in src/exceptions/{module}/ -- extend NestJS exception classes, use i18n keys
8. Register module in src/app.module.ts imports
9. Use .js extensions in all imports (ESM)

RULES:
- No any, no as (except Uuid boundary), no !, no magic strings, no inline errors
- No console.log, no unnecessary comments
- No process.env anywhere -- use ApiConfigService
- No dataSource.getRepository() -- inject repository classes
- Custom exceptions for every error case
- Controllers are thin: validate -> call service -> return .toDto()
- Services validate first, throw specific exceptions, return entities
- Repositories extend Repository<Entity> and inject DataSource
- Use @Transactional() for multi-table write operations
- Use PinoLogger with this.logger.setContext(ClassName.name)
- Use @Protected() with systemRole as needed
- Uuid is a branded type -- cast with `as Uuid` at boundaries only

CODE QUALITY PRIORITIES:
- Readable code over clever code
- No deep nesting -- max 2 levels, use early returns
- No long functions -- split if >20 lines
- Name things precisely -- `findById` not `getData`
- Fail loudly -- throw exceptions on invalid state
- No premature abstractions -- only extract when logic appears in 3+ places
```
