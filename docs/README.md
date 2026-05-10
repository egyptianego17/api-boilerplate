# Docs

Welcome. This is the index for [`docs/`](.). Every doc has a link below with a one-line summary; the matrix at the bottom maps common tasks to the right starting point.

---

## Reading order for new contributors

1. [`../README.md`](../README.md) — what the project is and how to run it locally
2. [`technologies.md`](./technologies.md) — the stack, with versions
3. [`architecture.md`](./architecture.md) — module map and request lifecycle
4. [`conventions/coding-standards.md`](./conventions/coding-standards.md) — patterns to write code by
5. [`conventions/api-responses.md`](./conventions/api-responses.md) — response/error envelope contract
6. [`conventions/naming.md`](./conventions/naming.md) — naming shorthand
7. [`guides/development.md`](./guides/development.md) — local-dev workflow

After that, dip into the recipes (`guides/`) and ops docs (`infrastructure/`) as the work demands.

---

## What's in each folder

### Root

| File | What it covers |
|---|---|
| [`README.md`](./README.md) | This index |
| [`architecture.md`](./architecture.md) | Module map, request lifecycle, design constraints |
| [`technologies.md`](./technologies.md) | Stack inventory with versions |

### `conventions/` — patterns to write code by

| File | What it covers |
|---|---|
| [`conventions/coding-standards.md`](./conventions/coding-standards.md) | Canonical "how to write code in this repo" — entities, repositories, services, controllers, DTOs, exceptions, transactions |
| [`conventions/api-responses.md`](./conventions/api-responses.md) | Standard success / error / paginated envelopes; exception-class table; i18n integration |
| [`conventions/naming.md`](./conventions/naming.md) | A/HC/LC pattern, action verbs, prefix rules, singular/plural |
| [`conventions/anti-patterns.md`](./conventions/anti-patterns.md) | Hard "no" list + smell list + code review checklist |

### `guides/` — "how do I…" recipes

| File | What it covers |
|---|---|
| [`guides/development.md`](./guides/development.md) | Local dev setup, DB config, migrations, Docker, VS Code debugging |
| [`guides/linting.md`](./guides/linting.md) | ESLint + Prettier + Biome + Husky configuration |
| [`guides/env-vars.md`](./guides/env-vars.md) | Every env var, where it's read, what it controls |
| [`guides/add-a-module.md`](./guides/add-a-module.md) | Step-by-step recipe for a new feature module (worked `posts` example) |
| [`guides/add-a-queue.md`](./guides/add-a-queue.md) | BullMQ queue + processor recipe |
| [`guides/add-a-mail-template.md`](./guides/add-a-mail-template.md) | Handlebars template + service-method recipe |
| [`guides/add-an-audited-entity.md`](./guides/add-an-audited-entity.md) | Opt a table into the audit log + emit business events |
| [`guides/exception-cookbook.md`](./guides/exception-cookbook.md) | Which exception to throw when, with i18n key map |

### `infrastructure/` — deployment + ops

| File | What it covers |
|---|---|
| [`infrastructure/deployment.md`](./infrastructure/deployment.md) | Docker, traditional servers, AWS / GCP / Heroku, CI/CD, scaling, backups |
| [`infrastructure/minio-setup.md`](./infrastructure/minio-setup.md) | MinIO S3 setup with nginx reverse proxy + SSL |
| [`infrastructure/observability.md`](./infrastructure/observability.md) | Prometheus / Loki / Grafana / AlertManager runbook + metrics catalog |

### `testing/`

| File | What it covers |
|---|---|
| [`testing/e2e-guide.md`](./testing/e2e-guide.md) | E2E test setup, structure, utilities, common patterns |

### `ai/` — AI-agent context

| File | What it covers |
|---|---|
| [`ai/prompts.md`](./ai/prompts.md) | Two reusable system prompts (review + feature-dev) for Claude / Cursor |
| [`ai/context-map.md`](./ai/context-map.md) | Which docs to load for which task; companion to [`CLAUDE.md`](../CLAUDE.md) |

---

## "Where do I look when I'm trying to…"

| Task | Start here |
|---|---|
| Onboard for the first time | [`architecture.md`](./architecture.md) → [`conventions/coding-standards.md`](./conventions/coding-standards.md) |
| Set up local dev | [`guides/development.md`](./guides/development.md) → [`guides/env-vars.md`](./guides/env-vars.md) |
| Run a one-off MinIO bucket | [`infrastructure/minio-setup.md`](./infrastructure/minio-setup.md) |
| Add a CRUD feature module | [`guides/add-a-module.md`](./guides/add-a-module.md) |
| Add a background job | [`guides/add-a-queue.md`](./guides/add-a-queue.md) |
| Audit row changes on a table | [`guides/add-an-audited-entity.md`](./guides/add-an-audited-entity.md) |
| Send a new transactional email | [`guides/add-a-mail-template.md`](./guides/add-a-mail-template.md) |
| Add a new env var | [`guides/env-vars.md`](./guides/env-vars.md) → "Adding a new env var" section |
| Pick the right exception class | [`guides/exception-cookbook.md`](./guides/exception-cookbook.md) |
| Code-review a PR | [`conventions/anti-patterns.md`](./conventions/anti-patterns.md) (the checklist) |
| Investigate slow / failing requests | [`infrastructure/observability.md`](./infrastructure/observability.md) → "It's slow / failing" runbook |
| Deploy to staging or prod | [`infrastructure/deployment.md`](./infrastructure/deployment.md) → [`guides/env-vars.md`](./guides/env-vars.md) |
| Add a Prometheus metric | [`infrastructure/observability.md`](./infrastructure/observability.md) → "Adding a metric" |
| Write an e2e test | [`testing/e2e-guide.md`](./testing/e2e-guide.md) |
| Configure ESLint / Prettier | [`guides/linting.md`](./guides/linting.md) |
| Start an AI session productively | [`ai/context-map.md`](./ai/context-map.md) → [`ai/prompts.md`](./ai/prompts.md) |

---

## See also

- [`../README.md`](../README.md) — project README (commands, quick start, top-level structure)
- [`../CLAUDE.md`](../CLAUDE.md) — auto-loaded context for Claude Code / Cursor sessions
