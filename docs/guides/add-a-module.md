# Add a New Module

Step-by-step recipe for creating a new feature module that follows the boilerplate's conventions. Worked example builds a `posts` CRUD module with title, body, and author (FK to user).

For the rules behind these patterns, read [`../conventions/coding-standards.md`](../conventions/coding-standards.md) first.

---

## What you'll build

`PostModule` exposing:
- `POST /v1/posts` — create a post (authenticated user becomes the author)
- `GET /v1/posts` — list posts (paginated)
- `GET /v1/posts/:id` — fetch a single post
- `PATCH /v1/posts/:id` — update title/body (author only)
- `DELETE /v1/posts/:id` — delete (author or admin)

Tables: `posts (id, title, body, author_id, created_at, updated_at)`.

---

## Folder layout

Create this structure under `src/modules/posts/`:

```
src/modules/posts/
├── dtos/
│   ├── create-post.dto.ts
│   ├── update-post.dto.ts
│   ├── post.dto.ts
│   └── post-page-options.dto.ts
├── entities/
│   └── post.entity.ts
├── repositories/
│   └── post.repository.ts
├── post.controller.ts
├── post.service.ts
└── post.module.ts
```

Plus:
```
src/exceptions/post/
├── post-not-found.exception.ts
└── post-forbidden-edit.exception.ts
```

---

## Step 1 — Entity

```typescript
// src/modules/posts/entities/post.entity.ts
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from '../../../common/abstract.entity.js';
import { UseDto } from '../../../decorators/use-dto.decorator.js';
import type { UserEntity } from '../../user/entities/user.entity.js';
import { PostDto } from '../dtos/post.dto.js';

@Entity({ name: 'posts' })
@UseDto(PostDto)
export class PostEntity extends AbstractEntity<PostDto> {
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'uuid' })
  authorId!: Uuid;

  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: Relation<UserEntity>;
}
```

**Why these choices:**
- `@Entity({ name: 'posts' })` — plural snake_case table name.
- `@UseDto(PostDto)` — wires up `entity.toDto()` (provided by `AbstractEntity`).
- String-based relation `'UserEntity'` — avoids circular imports.
- `Relation<UserEntity>` wrapper — required for lazy/string relations to typecheck.

---

## Step 2 — DTOs

```typescript
// src/modules/posts/dtos/create-post.dto.ts
import { StringField } from '../../../decorators/field.decorators.js';

export class CreatePostDto {
  @StringField({ minLength: 1, maxLength: 200 })
  title!: string;

  @StringField({ minLength: 1 })
  body!: string;
}
```

```typescript
// src/modules/posts/dtos/update-post.dto.ts
import { StringFieldOptional } from '../../../decorators/field.decorators.js';

export class UpdatePostDto {
  @StringFieldOptional({ minLength: 1, maxLength: 200 })
  title?: string;

  @StringFieldOptional({ minLength: 1 })
  body?: string;
}
```

```typescript
// src/modules/posts/dtos/post.dto.ts
import { StringField, UUIDField } from '../../../decorators/field.decorators.js';
import { AbstractDto } from '../../../common/dto/abstract.dto.js';
import type { PostEntity } from '../entities/post.entity.js';

export class PostDto extends AbstractDto {
  @StringField()
  title!: string;

  @StringField()
  body!: string;

  @UUIDField()
  authorId!: Uuid;

  constructor(entity: PostEntity) {
    super(entity);
    this.title = entity.title;
    this.body = entity.body;
    this.authorId = entity.authorId;
  }
}
```

```typescript
// src/modules/posts/dtos/post-page-options.dto.ts
import { PageOptionsDto } from '../../../common/dto/page-options.dto.js';

import { UUIDFieldOptional } from '../../../decorators/field.decorators.js';

export class PostPageOptionsDto extends PageOptionsDto {
  @UUIDFieldOptional()
  authorId?: Uuid;
}
```

**Why these choices:**
- Custom field decorators (`@StringField`, `@UUIDField`) bundle `class-validator` rules + Swagger `@ApiProperty` + transforms.
- Response DTO extends `AbstractDto` — gets `id` / `createdAt` / `updatedAt` for free.
- Constructor explicitly maps fields. No spreading.
- Page-options DTO extends `PageOptionsDto` (path: `src/common/dto/page-options.dto.ts`) for built-in pagination (`take`, `skip`, `order`, `orderBy`).

---

## Step 3 — Repository

```typescript
// src/modules/posts/repositories/post.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { PostEntity } from '../entities/post.entity.js';
import type { PostPageOptionsDto } from '../dtos/post-page-options.dto.js';

@Injectable()
export class PostRepository extends Repository<PostEntity> {
  constructor(dataSource: DataSource) {
    super(PostEntity, dataSource.createEntityManager());
  }

  private createBaseQueryBuilder(): SelectQueryBuilder<PostEntity> {
    return this.createQueryBuilder('post').select([
      'post.id',
      'post.title',
      'post.body',
      'post.authorId',
      'post.createdAt',
      'post.updatedAt',
    ]);
  }

  async findById(id: Uuid): Promise<PostEntity | null> {
    return this.createBaseQueryBuilder()
      .where('post.id = :id', { id })
      .getOne();
  }

  findPaginated(
    options: PostPageOptionsDto,
  ): SelectQueryBuilder<PostEntity> {
    const qb = this.createBaseQueryBuilder().orderBy(
      'post.createdAt',
      options.order,
    );

    if (options.authorId) {
      qb.andWhere('post.authorId = :authorId', { authorId: options.authorId });
    }

    return qb;
  }
}
```

**Why these choices:**
- Extends `Repository<PostEntity>` and injects `DataSource` directly. Never `dataSource.getRepository()`.
- `createBaseQueryBuilder()` keeps `findById` and `findPaginated` consistent on which columns they select.
- Always parameterized — `.where('post.id = :id', { id })`, never string interpolation.

---

## Step 4 — Service

```typescript
// src/modules/posts/post.service.ts
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import type { PageDto } from '../../common/dto/page.dto.js';
import { PostForbiddenEditException } from '../../exceptions/post/post-forbidden-edit.exception.js';
import { PostNotFoundException } from '../../exceptions/post/post-not-found.exception.js';
import { SystemRole } from '../../constants/system-role.js';
import type { UserEntity } from '../user/entities/user.entity.js';
import type { CreatePostDto } from './dtos/create-post.dto.js';
import type { PostPageOptionsDto } from './dtos/post-page-options.dto.js';
import type { PostDto } from './dtos/post.dto.js';
import type { UpdatePostDto } from './dtos/update-post.dto.js';
import { PostEntity } from './entities/post.entity.js';
import { PostRepository } from './repositories/post.repository.js';

@Injectable()
export class PostService {
  constructor(
    private readonly logger: PinoLogger,
    private postRepository: PostRepository,
  ) {
    this.logger.setContext(PostService.name);
  }

  async create(dto: CreatePostDto, author: UserEntity): Promise<PostEntity> {
    const post = this.postRepository.create({
      title: dto.title,
      body: dto.body,
      authorId: author.id,
    });
    return this.postRepository.save(post);
  }

  async findById(id: Uuid): Promise<PostEntity> {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new PostNotFoundException();
    }
    return post;
  }

  async findPaginated(
    options: PostPageOptionsDto,
  ): Promise<PageDto<PostDto>> {
    const qb = this.postRepository.findPaginated(options);
    const [items, meta] = await qb.paginate(options);
    return items.toPageDto(meta);
  }

  async update(
    id: Uuid,
    dto: UpdatePostDto,
    actor: UserEntity,
  ): Promise<PostEntity> {
    const post = await this.findById(id);

    if (post.authorId !== actor.id) {
      throw new PostForbiddenEditException();
    }

    Object.assign(post, dto);
    return this.postRepository.save(post);
  }

  async delete(id: Uuid, actor: UserEntity): Promise<void> {
    const post = await this.findById(id);

    if (post.authorId !== actor.id && actor.systemRole !== SystemRole.ADMIN) {
      throw new PostForbiddenEditException();
    }

    await this.postRepository.remove(post);
  }
}
```

**Why these choices:**
- `PinoLogger` with `setContext(PostService.name)`.
- Validate-first — `findById()` throws before any further logic.
- No try/catch — let custom exceptions propagate to the global filter.
- `qb.paginate()` and `items.toPageDto()` are from `boilerplate.polyfill.ts`.

---

## Step 5 — Controller

```typescript
// src/modules/posts/post.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PageDto } from '../../common/dto/page.dto.js';
import { ApiPageResponse } from '../../decorators/api-page-response.decorator.js';
import { AuthUser } from '../../decorators/auth-user.decorator.js';
import { UUIDParam } from '../../decorators/http.decorators.js';
import { Protected } from '../../decorators/protected.decorator.js';
import type { UserEntity } from '../user/entities/user.entity.js';
import { CreatePostDto } from './dtos/create-post.dto.js';
import { PostPageOptionsDto } from './dtos/post-page-options.dto.js';
import { PostDto } from './dtos/post.dto.js';
import { UpdatePostDto } from './dtos/update-post.dto.js';
import { PostService } from './post.service.js';

@Controller('posts')
@ApiTags('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @Protected()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ type: PostDto, description: 'Create a post' })
  async create(
    @AuthUser() user: UserEntity,
    @Body() dto: CreatePostDto,
  ): Promise<PostDto> {
    const post = await this.postService.create(dto, user);
    return post.toDto();
  }

  @Get()
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiPageResponse({ type: PostDto, description: 'List posts' })
  async list(
    @Query(new ValidationPipe({ transform: true }))
    options: PostPageOptionsDto,
  ): Promise<PageDto<PostDto>> {
    return this.postService.findPaginated(options);
  }

  @Get(':id')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PostDto, description: 'Get a post by id' })
  async findOne(@UUIDParam('id') id: Uuid): Promise<PostDto> {
    const post = await this.postService.findById(id);
    return post.toDto();
  }

  @Patch(':id')
  @Protected()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PostDto, description: 'Update a post (author only)' })
  async update(
    @UUIDParam('id') id: Uuid,
    @AuthUser() user: UserEntity,
    @Body() dto: UpdatePostDto,
  ): Promise<PostDto> {
    const post = await this.postService.update(id, dto, user);
    return post.toDto();
  }

  @Delete(':id')
  @Protected()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Delete a post (author or admin)' })
  async remove(
    @UUIDParam('id') id: Uuid,
    @AuthUser() user: UserEntity,
  ): Promise<void> {
    await this.postService.delete(id, user);
  }
}
```

**Why these choices:**
- Every endpoint has `@Protected()` (or `@Protected({ systemRole: SystemRole.ADMIN })` for admin-only routes), `@HttpCode(...)`, and `@ApiOkResponse`/`@ApiNoContentResponse`.
- `@UUIDParam('id')` validates UUID v4 at the request boundary.
- Controller is thin — calls service and returns `.toDto()` (or void for `DELETE`).

---

## Step 6 — Exceptions

```typescript
// src/exceptions/post/post-not-found.exception.ts
import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class PostNotFoundException extends BaseI18nException {
  constructor() {
    super('error.postNotFound', HttpStatus.NOT_FOUND);
  }
}
```

```typescript
// src/exceptions/post/post-forbidden-edit.exception.ts
import { HttpStatus } from '@nestjs/common';

import { BaseI18nException } from '../base-i18n.exception.js';

export class PostForbiddenEditException extends BaseI18nException {
  constructor() {
    super('error.postForbiddenEdit', HttpStatus.FORBIDDEN);
  }
}
```

See [`exception-cookbook.md`](./exception-cookbook.md) for picking the right HTTP status and naming convention.

---

## Step 7 — i18n keys

Append to each locale's `error.json`:

```json
// src/i18n/en/error.json
{
  "postNotFound": "Post not found",
  "postForbiddenEdit": "You do not have permission to edit this post"
}
```

Add equivalent translations in `src/i18n/ar/error.json` and `src/i18n/fr/error.json`. (English is the fallback if a locale lacks the key.)

---

## Step 8 — Module wiring

```typescript
// src/modules/posts/post.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PostEntity } from './entities/post.entity.js';
import { PostController } from './post.controller.js';
import { PostRepository } from './repositories/post.repository.js';
import { PostService } from './post.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity])],
  controllers: [PostController],
  providers: [PostService, PostRepository],
  exports: [PostService, PostRepository],
})
export class PostModule {}
```

Register it in [`src/app.module.ts`](../../src/app.module.ts):

```typescript
// imports list
import { PostModule } from './modules/posts/post.module.js';

@Module({
  imports: [
    LoggerModule,
    MetricsModule,
    AuthModule,
    AuthGoogleModule,
    UserModule,
    UploadModule,
    PostModule,                      // ← add here
    // ...rest unchanged
  ],
  // ...
})
```

---

## Step 9 — Migration

Generate a TypeORM migration from the entity diff:

```bash
npm run migration:generate -- src/database/migrations/AddPosts
```

The CLI introspects the entity definitions and produces something like `src/database/migrations/1730000000000-AddPosts.ts`. Review it (TypeORM occasionally generates surprising column types) before running:

```bash
npm run migration:run
```

To revert:
```bash
npm run migration:revert
```

---

## Step 10 — Smoke test

With `docker compose -f docker-compose-local.yml up -d` running and the app started via `npm run start:dev`:

1. Open Swagger at <http://localhost:3000/documentation> — the `posts` tag should appear with all five endpoints.
2. Hit `POST /v1/auth/login` to grab an access token.
3. `curl -X POST http://localhost:3000/v1/posts -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"title":"hi","body":"world"}'` — expect 201 with the new post DTO.
4. `curl http://localhost:3000/v1/posts -H "Authorization: Bearer $TOKEN"` — expect a paginated `{ data, meta }` envelope.
5. Try `lang=ar`: `curl http://localhost:3000/v1/posts/00000000-0000-0000-0000-000000000000?lang=ar -H "Authorization: Bearer $TOKEN"` — expect the Arabic "Post not found" message.

---

## Final checklist

Before opening the PR:

- [ ] All 10 steps executed
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run build:prod` succeeds
- [ ] `npm test` passes
- [ ] Migration runs cleanly on a fresh DB (`npm run migration:run` after `npm run schema:drop`)
- [ ] Endpoints visible in Swagger
- [ ] Created post → fetched → updated → deleted via curl
- [ ] All `error.*` keys exist in `en` (and ideally `ar` + `fr`)
- [ ] No `process.env`, no `any`, no `as` outside `Uuid`, no `!` outside DTO/entity columns
- [ ] Reviewed against [`../conventions/anti-patterns.md`](../conventions/anti-patterns.md)

---

## See also

- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) — patterns for every file above
- [`../conventions/anti-patterns.md`](../conventions/anti-patterns.md) — code review checklist
- [`exception-cookbook.md`](./exception-cookbook.md) — picking the right exception class
- [`env-vars.md`](./env-vars.md) — if your module needs new config
- [`../testing/e2e-guide.md`](../testing/e2e-guide.md) — adding e2e tests for the new endpoints
