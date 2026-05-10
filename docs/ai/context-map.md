# AI Context Map

Companion to [`prompts.md`](./prompts.md). When an AI agent (Claude Code, Cursor, etc.) opens a session in this repo, this map answers two questions:

1. **What context auto-loads?** ([`CLAUDE.md`](../../CLAUDE.md) `@`-references at session start.)
2. **What should I add for *this specific* task?** (Below.)

---

## How `CLAUDE.md` works

The file [`CLAUDE.md`](../../CLAUDE.md) at the repo root is read by Claude Code on every session. Each `@path` line is interpreted as "load this file's content as background". The current set:

```markdown
- backend-coding-standards @docs/conventions/coding-standards.md
- naming-cheatsheet @docs/conventions/naming.md
- api-response-standards @docs/conventions/api-responses.md
- ai-prompts @docs/ai/prompts.md
- architecture @docs/architecture.md
```

Cursor reads the same `CLAUDE.md` for context (and also supports `.cursorrules` if you want IDE-specific rules). Other agents typically read whichever of `CLAUDE.md` / `AGENTS.md` / `.aider.conf.yml` is present.

**Keep `CLAUDE.md` short.** The five files above plus `README.md` are loaded *every* session — adding more increases token cost without proportional value. Task-specific docs go in the load map below instead.

---

## Always-loaded set (high signal, low token cost)

Reading order on first open:

1. **[`README.md`](../../README.md)** — what the repo is, how to run it, top-level layout.
2. **[`docs/architecture.md`](../architecture.md)** — module map + request lifecycle. Anchors all subsequent reasoning.
3. **[`docs/conventions/coding-standards.md`](../conventions/coding-standards.md)** — the rules. Skim sections 1–2 (Zero-Tolerance + Self-Explaining Code), reference the rest as needed.
4. **[`docs/conventions/api-responses.md`](../conventions/api-responses.md)** — the response/error envelope contract.
5. **[`docs/conventions/naming.md`](../conventions/naming.md)** — naming convention shorthand.
6. **[`docs/ai/prompts.md`](./prompts.md)** — review and feature-dev prompts you can wholesale reuse.

Together these are ~2 000 lines of context. After that, load only what the specific task demands.

---

## Task → load map

When the user gives you a task, load the matching row's docs *in addition to* the always-loaded set. Most tasks need 2–3 extra files.

| Task | Extra docs to load |
|---|---|
| **Add a new module** | [`architecture.md`](../architecture.md), [`guides/add-a-module.md`](../guides/add-a-module.md), [`guides/exception-cookbook.md`](../guides/exception-cookbook.md), [`guides/env-vars.md`](../guides/env-vars.md) (if the module needs new config) |
| **Add a queue / background job** | [`guides/add-a-queue.md`](../guides/add-a-queue.md), [`infrastructure/observability.md`](../infrastructure/observability.md) (for metrics + dashboard wiring) |
| **Add a transactional email** | [`guides/add-a-mail-template.md`](../guides/add-a-mail-template.md), [`guides/add-a-queue.md`](../guides/add-a-queue.md) (if sending async), [`guides/env-vars.md`](../guides/env-vars.md) |
| **Add or rename an env var** | [`guides/env-vars.md`](../guides/env-vars.md), [`infrastructure/deployment.md`](../infrastructure/deployment.md) |
| **Fix a bug in the auth flow** | [`architecture.md`](../architecture.md), [`conventions/coding-standards.md`](../conventions/coding-standards.md), [`guides/exception-cookbook.md`](../guides/exception-cookbook.md). Then *read the actual auth source*: `src/modules/auth/`, `src/modules/auth-google/`. |
| **Code review a PR** | [`conventions/anti-patterns.md`](../conventions/anti-patterns.md) (the checklist), [`conventions/coding-standards.md`](../conventions/coding-standards.md), [`ai/prompts.md`](./prompts.md) (Prompt 1 — feed this directly to the AI). |
| **Refactor for performance** | [`infrastructure/observability.md`](../infrastructure/observability.md) (find the actual hotspot first), [`conventions/coding-standards.md`](../conventions/coding-standards.md) (so the refactor doesn't drift). |
| **Set up local dev** | [`guides/development.md`](../guides/development.md), [`guides/env-vars.md`](../guides/env-vars.md), [`infrastructure/minio-setup.md`](../infrastructure/minio-setup.md). |
| **Deploy to staging / prod** | [`infrastructure/deployment.md`](../infrastructure/deployment.md), [`guides/env-vars.md`](../guides/env-vars.md), [`infrastructure/observability.md`](../infrastructure/observability.md). |
| **Write or update e2e tests** | [`testing/e2e-guide.md`](../testing/e2e-guide.md), [`conventions/api-responses.md`](../conventions/api-responses.md) (for asserting envelope shapes). |
| **Add or fix lint rules** | [`guides/linting.md`](../guides/linting.md). |
| **Investigate a production incident** | [`infrastructure/observability.md`](../infrastructure/observability.md) (runbook section), [`architecture.md`](../architecture.md) (for understanding which subsystem to suspect). |

---

## When to read source instead of docs

Docs explain patterns. Source is the truth. Always read source for:

- **The actual signature** of a decorator, helper, or service before generating code that calls it. Decorators in `src/decorators/` and helpers in `src/common/utils.ts` change rarely but the docs may lag a refactor by a release.
- **Imports** for the example you're modeling on. The docs show the right pattern; the source shows the right paths and `.js` extensions.
- **What env vars exist.** [`env-vars.md`](../guides/env-vars.md) is the reference, but [`src/shared/services/api-config.service.ts`](../../src/shared/services/api-config.service.ts) is authoritative.
- **What modules are wired up.** [`architecture.md`](../architecture.md) lists them; [`src/app.module.ts`](../../src/app.module.ts) is authoritative.

If a doc and source disagree, source wins — flag the doc drift in the response.

---

## Naming convention for new docs

When you add a new doc, follow these conventions so the load map stays scannable.

- **Filename:** kebab-case, no extension noise. `add-a-module.md`, not `Adding-A-Module-Guide.md`.
- **Folder:** intent-driven, one of:
  - `conventions/` — patterns to write code by
  - `guides/` — task recipes ("how do I…")
  - `infrastructure/` — deployment + ops
  - `testing/` — testing approaches
  - `ai/` — AI-agent context
- **Top of file:** one-paragraph summary of what the doc covers, who the audience is, and a link to the most-related companion doc.
- **Bottom of file:** "See also" section linking to companion docs.
- **Always cross-link** with relative paths (`../conventions/coding-standards.md`) so links work in GitHub UI and IDE previewers.
- **Update [`docs/README.md`](../README.md)** to reference the new doc.
- **Update this file** if the doc unblocks a class of task — add a row to the task → load map.

---

## See also

- [`prompts.md`](./prompts.md) — review + feature-dev prompts ready to paste
- [`../README.md`](../README.md) — full docs index
- [`../../CLAUDE.md`](../../CLAUDE.md) — auto-loaded context (root of repo)
