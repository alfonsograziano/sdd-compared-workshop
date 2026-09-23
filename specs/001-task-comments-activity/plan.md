# Implementation Plan: Task Comments and Activity Log

**Branch**: `spec-kit` (feature dir `001-task-comments-activity`) | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-task-comments-activity/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add two new tables, `comments` and `task_activity`, both with a foreign key to `tasks` using
`ON DELETE CASCADE`, in one new drizzle-kit migration. Comments get full create/edit/delete
through three new Server Actions backed by a new data-layer module `src/lib/comments.ts`.
Activity is written by the existing data-layer functions (`createTask`, `updateTask`,
`moveTask`) inside the transaction that makes the change, through a small helper module
`src/lib/activity.ts`, so every path that changes a task records it and no caller can forget.
The task page reads a merged, time-ordered timeline (`src/lib/timeline.ts`) and renders it with
a new Client Component under the description. `listTasks` gains a `commentCount` per task, shown
as an icon and number on board cards and list rows.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) on Node.js 24

**Primary Dependencies**: Next.js 16.3 App Router (Server Components + Server Actions), React 19.2,
Drizzle ORM 0.45, zod 4.6, react-markdown 10 + remark-gfm 4, Tailwind CSS 4. No new dependencies.

**Storage**: SQLite file through better-sqlite3 13 (`data/app.db`), migrations by drizzle-kit 0.31,
applied on first open by `createDb`

**Testing**: Vitest 5 (unit, in-memory SQLite), Playwright 1.63 (e2e against `data/e2e.db`)

**Target Platform**: Local Node.js server, desktop browser

**Project Type**: Single Next.js web application (one package, no separate backend)

**Performance Goals**: Task page and board render with no noticeable delay for one user; the
comment count adds one grouped query per board or list load, not one per task

**Constraints**: One user, no auth (constitution V); data access only in `src/lib/` (I); every
mutation is a Server Action with zod validation (II); new migration that keeps existing data (III)

**Scale/Scope**: Tens to low hundreds of tasks, tens of timeline entries per task; no paging
(clarification 2026-09-23)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
|---|---|---|---|
| I. One Data Layer | New queries live in `src/lib/comments.ts`, `src/lib/activity.ts`, `src/lib/timeline.ts`; each takes an optional `db`; Client Components only `import type` from them | PASS | PASS — see data-model.md and contracts |
| I. One Data Layer | Multi-row writes run in one transaction | PASS | PASS — activity is written inside the same `db.transaction` as the task change |
| II. Server Actions + zod | Comment mutations are Server Actions in `src/app/actions.ts`; bodies validated by `commentBodySchema` in `src/lib/validation.ts`; ids validated in the action | PASS | PASS — contracts/server-actions.md |
| III. Migrations | One new file from `npm run db:generate -- --name comments_and_activity`; only `CREATE TABLE`/`CREATE INDEX`; cascade FKs; seed clears new tables through cascade | PASS | PASS — data-model.md |
| IV. Tests | Unit tests for every new data-layer function; e2e for add/edit/delete comment, activity entry and board count | PASS | PASS — quickstart.md lists them |
| V. Keep It Small | No author, no users, no new dependency, no generic event bus | PASS | PASS |
| VI. Accessible, Dense UI | Timeline is an ordered list; every control has an accessible name; colors from tokens | PASS | PASS — contracts/ui.md |

No violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-comments-activity/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── server-actions.md
│   └── ui.md
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
drizzle/
└── 0001_comments_and_activity.sql   # NEW migration (+ meta/ snapshot and journal entry)

src/
├── app/
│   ├── actions.ts                   # + createCommentAction, updateCommentAction, deleteCommentAction
│   ├── list/page.tsx                # + comment count next to the title
│   └── tasks/[id]/page.tsx          # + loads the timeline and passes it to TaskDetail
├── components/
│   ├── CommentCount.tsx             # NEW icon + number, renders nothing for 0
│   ├── TaskCard.tsx                 # + CommentCount
│   ├── TaskDetail.tsx               # + renders <Timeline> under the description
│   ├── Timeline.tsx                 # NEW client component: entries, comment form, edit, delete
│   └── icons.tsx                    # + CommentIcon
└── lib/
    ├── activity.ts                  # NEW record + list + describe activity
    ├── comments.ts                  # NEW list/create/update/delete/count comments
    ├── timeline.ts                  # NEW merge comments + activity into timeline items
    ├── db/schema.ts                 # + comments, taskActivity tables
    ├── seed.ts                      # + two demo comments
    ├── tasks.ts                     # createTask/updateTask/moveTask record activity; Task gains commentCount
    └── validation.ts                # + commentBodySchema

tests/
├── unit/
│   ├── activity.test.ts             # NEW
│   ├── comments.test.ts             # NEW
│   └── timeline.test.ts             # NEW
└── e2e/
    └── comments.spec.ts             # NEW
```

**Structure Decision**: The existing single Next.js app layout is kept. New data access goes in
three sibling modules of `src/lib/tasks.ts`, following principle I. UI changes stay in
`src/components/`, pages stay Server Components.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations.
