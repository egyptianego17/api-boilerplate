# Add an Audited Entity

Recipe for opting a table into the audit log. Worked example: a `posts` table that captures every INSERT / UPDATE / DELETE, redacts a sensitive `secret_note` column, and emits a `posts.published` business event when the author hits Publish.

For the design behind this, read the "Audit log" section of [`../architecture.md`](../architecture.md) first.

---

## What you'll get

Every row change to your table — including rows deleted by `ON DELETE CASCADE` from a parent — lands in a single partitioned `audit_log` table with:

- the operation (`INSERT` / `UPDATE` / `DELETE`)
- the full pre-change row (`old_data`) and post-change row (`new_data`) as JSONB
- the diff (`changed_columns`) on UPDATE, with `updated_at`-only changes filtered out as noise
- the actor (`changed_by`) and request correlation (`request_id`)
- redacted sensitive columns replaced with `"<redacted>"`

Plus, your service code can emit business events into the same table via `AuditService.record(...)`, so a forensic query can join "what action happened" with "what database row changed."

---

## Concept

Three moving parts:

1. **Database trigger.** One generic `record_row_change()` function and an `attach_audit_log()` helper, both installed by [`AuditService.onApplicationBootstrap()`](../../src/modules/audit/services/audit.service.ts) on every app start using `CREATE OR REPLACE FUNCTION`. SQL bodies live in [`src/modules/audit/sql/bootstrap.sql.ts`](../../src/modules/audit/sql/bootstrap.sql.ts). The trigger fires on every write, regardless of who issued it (app, migration, raw SQL, cascaded child delete).
2. **Actor-context propagation.** [`TransactionContextSubscriber`](../../src/entity-subscribers/transaction-context.subscriber.ts) runs `set_config('app.current_user_id', ...)` on the EntityManager's connection in `beforeInsert` / `beforeUpdate` / `beforeRemove`. The trigger reads this with `current_setting('app.current_user_id', true)`. The exact GUC names live in [`postgres-context-vars.ts`](../../src/modules/audit/constants/postgres-context-vars.ts) so the writer and the trigger SQL stay in sync.
3. **Business-event emission.** [`AuditService.record('posts.published', { ... }, { objectId })`](../../src/modules/audit/services/audit.service.ts) inserts an `EVENT` row alongside the row-change rows. Same table, same `request_id`.

Under sync mode (`DB_SYNCHRONIZE=true`), the `audit_log` table is created from the entity as a normal (non-partitioned) table — partitioning is forfeited. If/when row volume warrants it, re-introduce a one-off migration that recreates the table as `PARTITION BY RANGE (changed_at)`.

---

## Step 1 — Register the table

Add the table to [`src/modules/audit/constants/audited-table.ts`](../../src/modules/audit/constants/audited-table.ts):

```typescript
export enum AuditedTable {
  Users = 'users',
  UserSettings = 'user_settings',
  Posts = 'posts',
}
```

Then add an entry to [`src/modules/audit/audited-tables.ts`](../../src/modules/audit/audited-tables.ts):

```typescript
export const AUDITED_TABLES: ReadonlyArray<AuditedTableSpec> = [
  // ...existing entries
  {
    table: AuditedTable.Posts,
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    redactColumns: ['secret_note'],
  },
];
```

`AuditService.onApplicationBootstrap()` calls `attach_audit_log(table, operations, redact_columns)` for each entry on every boot. The SQL function does `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER`, so re-running is safe.

Fields on `AuditedTableSpec` (all required):

- **`table`** — `AuditedTable` enum member. The enum value is the snake_case table name Postgres resolves as `regclass`, so the table must already exist (sync mode creates it from the entity before bootstrap fires).
- **`operations`** — subset of `['INSERT', 'UPDATE', 'DELETE']`. A noisy table can opt out of UPDATE; a write-once table can audit only INSERT.
- **`redactColumns`** — column names (snake_case) that must never appear in `audit_log`. Replaced with `"<redacted>"` in both `old_data` and `new_data`. Use for password hashes, tokens, secrets — anything you'd never want in a forensic export. Pass `[]` for none.

---

## Step 2 — FK with `ON DELETE CASCADE`

Declare relations the normal way. Cascaded children are auto-audited as long as they're attached:

```typescript
@ManyToOne('UserEntity', { onDelete: 'CASCADE' })
@JoinColumn({ name: 'author_id' })
author?: Relation<UserEntity>;
```

When a parent is deleted, Postgres cascades as ordinary DELETEs against the child table; each cascaded child fires its `AFTER DELETE` trigger, so the audit log captures the parent and every cascaded child in the same `request_id`. No TypeScript orchestration.

---

## Step 3 — Standards for code paths

The trigger always fires; what varies is whether actor metadata gets attached, and that depends on whether the change went through a TypeORM `EntitySubscriber` hook. The full coverage table and rule live in [`../conventions/coding-standards.md` §13](../conventions/coding-standards.md#13-mutations-on-audited-tables) — read it once before writing service code that mutates an audited table.

Short version: for actor-driven mutations, prefer `.save(entity)` / `.remove(entity)` so `changed_by` is populated. Use `.update(criteria, ...)` only for non-actor work (token rotations, scheduled cleanup) — those audit rows will have `changed_by IS NULL`, which is the correct semantics.

---

## Step 4 — Emit business events

Add the event to [`src/modules/audit/constants/audit-event.ts`](../../src/modules/audit/constants/audit-event.ts):

```typescript
export enum AuditEvent {
  // ...existing entries
  PostsPublished = 'posts.published',
}

export const AUDIT_EVENT_NAMESPACE: Record<AuditEvent, string> = {
  // ...existing entries
  [AuditEvent.PostsPublished]: 'posts',
};
```

The `Record<AuditEvent, string>` map is exhaustive — TypeScript refuses to compile if you add a new enum member without a namespace mapping. The namespace is what `AuditService` writes to `table_name` on the EVENT row.

Then inject `AuditService` and call `record(...)`:

```typescript
// src/modules/posts/post.service.ts
import { AuditEvent } from '../audit/constants/audit-event.js';
import { AuditService } from '../audit/services/audit.service.js';

constructor(
  private readonly auditService: AuditService,
  // ...
) {}

async publish(postId: Uuid): Promise<PostDto> {
  const post = await this.postRepository.findById(postId);

  if (!post) {
    throw new PostNotFoundException();
  }

  post.publishedAt = new Date();
  await this.postRepository.save(post);

  await this.auditService.record(AuditEvent.PostsPublished, {
    objectId: post.id,
    payload: { title: post.title },
  });

  return post.toDto();
}
```

`AuditModule` is `@Global()` — no need to add it to your module's `imports`.

**Naming the event:** `<namespace>.<verb_in_past_tense>` — `posts.published`, `auth.password_reset_completed`.

**Payload:** small and non-sensitive. The event payload is *not* run through the column-redaction pipeline. No passwords or tokens.

---

## Step 5 — Verify

```bash
npm run migration:run
npm run start:dev
```

Hit the endpoints that touch your table, then in psql:

```sql
-- Recent activity on this table
SELECT operation, changed_by, request_id, changed_columns, new_data->>'title'
FROM audit_log
WHERE table_name = 'posts'
ORDER BY changed_at DESC
LIMIT 20;

-- Full timeline of one row
SELECT operation, changed_at, changed_by, changed_columns
FROM audit_log
WHERE table_name = 'posts' AND object_id = '<uuid>'
ORDER BY changed_at;

-- Forensic view: everything that happened in one request
SELECT operation, table_name, event_name, changed_columns
FROM audit_log
WHERE request_id = '<uuid-from-logs>'
ORDER BY id;

-- Confirm sensitive columns redacted
SELECT new_data
FROM audit_log
WHERE table_name = 'posts' AND operation = 'UPDATE'
LIMIT 1;
-- new_data->>'secret_note' should be '<redacted>'
```

---

## Common gotchas

- **The trigger fires `AFTER` the row write.** If your INSERT/UPDATE rolls back, the audit row rolls back too — they share the same transaction. Good.
- **`updated_at`-only updates produce no audit row.** The trigger filters them as noise. If you actually want to log "row was touched," use `AuditService.record('posts.touched', ...)` instead.
- **Bypass paths still produce audit rows but with `changed_by IS NULL`.** This is intentional — it's graceful degradation, not silent failure.
- **`AuditService.record(...)` is fire-and-forget by design.** Failures are logged via PinoLogger but do not throw. The audit log is observability, not a hard dependency.
- **Don't audit the `audit_log` table itself.** The foundation migration doesn't attach the trigger to it; if you ever do, you'll get an infinite recursion.

---

## See also

- [`../architecture.md`](../architecture.md) — "Audit log" section
- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) — "Mutations on audited tables"
- [Brandur — Soft Deletion Probably Isn't Worth It](https://brandur.org/soft-deletion) — the design rationale
- [Supabase — Postgres Auditing in 150 lines of SQL](https://supabase.com/blog/postgres-audit) — the trigger pattern
- [Vlad Mihalcea — PostgreSQL audit logging using triggers](https://vladmihalcea.com/postgresql-audit-logging-triggers/) — `set_config` actor propagation
