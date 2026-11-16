# Tasks

## This branch

This is the `bmad` branch. It adds comments and an activity log to tasks, built with BMAD Method 6.12.0. `bmad-spec` wrote the spec, `bmad-build` planned, built and reviewed the code, and a separate `bmad-review` pass checked it adversarially. Each phase is its own commit. Read [docs/BRANCH.md](docs/BRANCH.md) first: it lists the artifacts in reading order, what BMAD installed, and every decision made during the run.

A small task manager in the style of Linear. It has a Kanban board, a list view and a detail page for each task. It runs on your machine with a local SQLite file, has no login and is made for one user.

The app is small on purpose. You can read the whole codebase in a few minutes.

## The workshop

This repo backs a course that compares three spec-driven development frameworks: Spec Kit, OpenSpec and BMAD Method.

`master` is the shared starting point. It is a normal, working app with no framework installed. Each of the three branches starts from `master` and adds the same feature, described in [docs/FEATURE.md](docs/FEATURE.md), using one framework:

| Branch | Framework |
|---|---|
| `spec-kit` | [Spec Kit](https://github.com/github/spec-kit) |
| `openspec` | [OpenSpec](https://github.com/Fission-AI/OpenSpec) |
| `bmad` | [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) |

Compare a branch with `master` to see what the framework produced: the spec files, the plan, and the code. For example: `git diff master..openspec --stat`.

## Run it

You need Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run db:migrate   # creates data/app.db and its tables
npm run db:seed      # fills it with 12 demo tasks and 3 comments (this deletes what is there)
npm run dev          # http://localhost:3000
```

The app also runs the migrations on its own the first time it opens the database, so `db:migrate` is only needed when you want to be explicit.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate the Next.js route types and run `tsc` |
| `npm run test` | Run the unit tests (Vitest, in-memory SQLite) |
| `npm run test:e2e` | Run the Playwright smoke test (uses its own `data/e2e.db`) |
| `npm run db:generate` | Create a new migration after you change the schema |
| `npm run db:migrate` | Apply the migrations to `data/app.db` |
| `npm run db:seed` | Reset `data/app.db` to the demo data |

Set `DATABASE_PATH` to use another database file.

## Folder map

```
drizzle/               SQL migrations made by drizzle-kit
docs/FEATURE.md        the feature every workshop branch builds
scripts/               migrate and seed scripts
src/app/               pages (board, list, task detail) and Server Actions
  actions.ts           every mutation goes through here
  page.tsx             board view  (/)
  list/page.tsx        list view   (/list)
  tasks/[id]/page.tsx  task detail (/tasks/:id)
src/components/        UI: Board, TaskCard, TaskDetail, Timeline, Toolbar, NewTaskButton, ...
  Timeline.tsx         comments and activity under a task's description
src/lib/
  db/schema.ts         Drizzle tables
  db/index.ts          opens the database and runs migrations
  tasks.ts             data access: list, get, create, update, move, delete
  comments.ts          data access: list, create, edit, delete and count comments
  activity.ts          records task changes and words them for the timeline
  timeline.ts          merges a task's comments and activity, oldest first
  errors.ts            NotFoundError for a missing task or comment
  validation.ts        zod schemas for every input
  constants.ts         statuses and priorities
  format.ts            small display and sort helpers
  seed.ts              demo data
tests/unit/            Vitest tests for the data layer and helpers
tests/e2e/             Playwright tests (smoke test, comments and activity)
```

## How it works

Pages are React Server Components. They read data by calling `src/lib/tasks.ts` directly. Every change (create, edit, move, delete) is a Server Action in `src/app/actions.ts`. The action calls the data layer and then refreshes the page with `revalidatePath`. The data layer checks every input with zod before it writes.

The task page shows a timeline under the description that mixes comments and activity, oldest first. `createTask`, `updateTask` and `moveTask` record one activity entry per changed field in the same transaction as the change, and updating, moving or commenting on a missing task, or editing or deleting a missing comment, throws `NotFoundError`, which the Server Actions return as `{ ok: false }`. Deleting a missing task does nothing.

Filters (search, priority, label) live in the URL, so a filtered view can be shared or reloaded.

## Data model

```
tasks                               labels
-----                               ------
id          integer, primary key    id     integer, primary key
title       text, required          name   text, unique
description text, markdown          color  text, hex like #5e6ad2
status      backlog | todo | in_progress | done | canceled
priority    none | low | medium | high | urgent
due_date    text YYYY-MM-DD, optional
position    integer, order inside a status column
created_at  timestamp (ms)
updated_at  timestamp (ms)

task_labels (many to many)
-----------
task_id   -> tasks.id   (on delete cascade)
label_id  -> labels.id  (on delete cascade)
primary key (task_id, label_id)

comments                            task_activity
--------                            -------------
id          integer, primary key    id          integer, primary key
task_id     -> tasks.id (cascade)   task_id     -> tasks.id (cascade)
body        text, markdown          field       title | description | status | priority
created_at  timestamp (ms)                      | labels | dueDate, null = created
edited_at   timestamp (ms), null    old_value   text, as stored (keys, YYYY-MM-DD,
            until the body changes  new_value   plain text, JSON array of label names)
                                    created_at  timestamp (ms)
```

When a card is dropped on the board, the app places it before its new neighbor and renumbers the column, so positions stay 0, 1, 2 and so on.
