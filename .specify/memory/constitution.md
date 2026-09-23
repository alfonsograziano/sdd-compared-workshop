# Tasks App Constitution

## Core Principles

### I. One Data Layer

- All reads and writes to the database MUST go through modules in `src/lib/` (today
  `src/lib/tasks.ts`, plus new sibling modules for new entities).
- Pages, components and Server Actions MUST NOT import Drizzle tables or build queries.
- Every data-layer function MUST accept an optional `db` argument (defaulting to `getDb()`) so
  tests can pass an in-memory database.
- Client Components MUST only use `import type` from `src/lib/tasks.ts` or `src/lib/db/*`,
  because those modules load `better-sqlite3`, which cannot run in the browser.
- A change that touches more than one row or table MUST run inside one `db.transaction`.

Rationale: one place to read means one place to test, and the app stays easy to reason about.

### II. Server Actions and Validated Input

- Every mutation MUST be a Server Action in `src/app/actions.ts`. Route handlers MUST NOT be
  added for mutations.
- Every input MUST be parsed with a zod schema from `src/lib/validation.ts` inside the data
  layer before any write. Server Actions MUST validate ids.
- Server Actions MUST call `revalidatePath("/", "layout")` after a successful write and MUST
  return validation errors as `{ ok: false, error }` instead of throwing to the client.

Rationale: one door for writes and one set of rules for input keep bad data out of SQLite.

### III. Schema Changes Only Through Migrations

- The schema lives in `src/lib/db/schema.ts`. A schema change MUST come with a new migration made
  by `npm run db:generate -- --name <what_changed>` and committed in `drizzle/`.
- Old migrations MUST NOT be edited. Migrations MUST keep existing data: add tables and
  nullable or defaulted columns; do not drop or rewrite data without an explicit plan.
- Foreign keys to tasks MUST use `ON DELETE CASCADE` when the child row has no meaning without
  its task. `src/lib/seed.ts` MUST be updated when new tables need clearing or demo data.

Rationale: the app migrates itself on first open, so every user's database must upgrade safely.

### IV. Tests Prove the Change (NON-NEGOTIABLE)

- Every new or changed data-layer function MUST have a Vitest unit test in `tests/unit/` that
  runs against an in-memory SQLite database.
- Every new or changed user flow MUST be covered by a Playwright test in `tests/e2e/`.
- A change is done only when `npm run lint`, `npm run typecheck`, `npm run test`,
  `npm run build` and `npm run test:e2e` all pass.

Rationale: the app is small enough that full verification is cheap, so there is no excuse to skip.

### V. Keep It Small

- The app is for one user on one machine. There is no auth, no users table, no author fields and
  no permissions. Features MUST NOT add them.
- Prefer the simplest design that meets the spec. New dependencies MUST be justified in the plan
  and pinned to an exact version (no `^` or `~`).
- No speculative abstractions: build for the feature in front of you, not for guessed futures.

Rationale: the codebase is meant to be read in a few minutes; every extra layer costs that.

### VI. Accessible, Dense UI

- Interactive elements MUST be real buttons, links, inputs or selects, or carry the right `role`,
  `tabIndex` and keyboard handler. Every input and icon-only control MUST have an accessible name
  (`aria-label` or a visible label).
- Colors MUST come from the tokens in `src/app/globals.css` (`bg`, `panel`, `panel-hover`, `line`,
  `fg`, `muted`, `accent`) so light and dark mode both work.
- The UI stays dense in the style of Linear: small type, tight spacing, no decorative chrome.

Rationale: e2e tests find elements by role and name, and so do people who use a keyboard or a
screen reader.

## Technology Constraints

- Runtime: Node.js 24. Framework: Next.js 16 App Router with React Server Components.
  This Next.js has breaking changes; read `node_modules/next/dist/docs/` before using an API.
- Language: TypeScript in strict mode. Styling: Tailwind CSS 4.
- Storage: SQLite through `better-sqlite3` and Drizzle ORM; migrations by `drizzle-kit`.
- Validation: zod. Markdown rendering: `react-markdown` with `remark-gfm` via
  `src/components/Markdown.tsx`.
- Tests: Vitest for unit tests (in-memory SQLite), Playwright for e2e (own database at
  `data/e2e.db`, reseeded on start).
- Pages are Server Components that read through the data layer; interactive parts are Client
  Components in `src/components/`.

## Development Workflow and Quality Gates

- Work on a feature branch. Each change starts from a spec, then a plan, then tasks.
- Before a change is called done, run in order: `npm run lint`, `npm run typecheck`,
  `npm run test`, `npm run build`, `npm run test:e2e`. All MUST pass.
- A plan MUST pass the Constitution Check in its plan.md before design and again after it.
  Any violation MUST be written in the plan's Complexity Tracking table with the reason.
- Keep README.md and CLAUDE.md in step with changes to the data model, scripts or conventions.

## Governance

- This constitution overrides other practice docs where they conflict. CLAUDE.md and AGENTS.md
  hold day-to-day runtime guidance and MUST stay consistent with it.
- Amendments are made through `/speckit-constitution`, recorded in git, and MUST update any
  dependent Spec Kit template that the change affects.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR for
  a new principle or section, PATCH for wording.
- Every plan and every review MUST check compliance with these principles.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
