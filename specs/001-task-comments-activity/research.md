# Research: Task Comments and Activity Log

Phase 0 output for [plan.md](./plan.md). The Technical Context had no NEEDS CLARIFICATION items;
the stack is fixed by the constitution. The research below settles the design choices that the
spec leaves open.

## R1. Where activity gets recorded

- **Decision**: Inside the data layer. `createTask`, `updateTask` and `moveTask` in
  `src/lib/tasks.ts` compare the row before and after and call `recordActivity(tx, ...)` in the
  same transaction.
- **Rationale**: FR-008 says every change must be recorded "whatever part of the app made the
  change". The data layer is the only door to the database (constitution I), so recording there
  covers the task page, the board drag and drop, and the seed. One transaction means a change and
  its activity entry are saved together or not at all.
- **Alternatives considered**: Recording in the Server Actions (a new action could forget it);
  SQLite triggers (hidden logic, cannot resolve label names cleanly, hard to test with Drizzle);
  a generic event emitter (extra layer, against constitution V).

## R2. How to store old and new values

- **Decision**: One row per changed field in `task_activity` with `field`, `old_value` and
  `new_value` as nullable text. Status and priority store their stable keys (`in_progress`,
  `urgent`); due date stores `YYYY-MM-DD` or null; title and description store the text; labels
  store a JSON array of label names. The row for task creation has `field = null`.
- **Rationale**: Keys are stable and map to display names at render time (FR-010). Label names are
  a snapshot, so deleting or renaming a label later does not break old entries (spec edge case).
  One row per field matches "one activity entry per field that really changed".
- **Alternatives considered**: Storing the final sentence (cannot be re-rendered or tested by
  field); storing label ids (break when a label is deleted); one row per save with a JSON diff
  (harder to query and to show one line per change).

## R3. Label change wording

- **Decision**: Compute added and removed names from the old and new arrays at render time.
  Sentences: "added label Docs", "removed label Bug", or "added label Docs and removed label Bug";
  plural "labels" when more than one.
- **Rationale**: FR-011. Keeping both full arrays stores the true before/after state and still lets
  us render the difference.

## R4. Detecting "no change"

- **Decision**: `updateTask` compares each provided field with the current row (labels as sorted id
  sets) and records only real changes. `moveTask` records a status entry only when the status
  differs. `updatedAt` keeps its current behavior.
- **Rationale**: FR-013 and SC-002 (0 entries for saves that change nothing).

## R5. Comment "edited" state

- **Decision**: `comments.updated_at` is nullable. It is set only when an edit changes the body.
  "Edited" is shown when it is not null; its value is the last edit time (clarification Q5).
- **Rationale**: Simplest model; saving the same text does not mark the comment as edited
  (spec edge case).

## R6. Timeline order and ties

- **Decision**: Merge comments and activity in memory, sort by time ascending, then activity before
  comment, then id. Times are milliseconds (`unixepoch('subsec') * 1000` default like `tasks`),
  but the data layer sets `created_at` explicitly from one `new Date()` per transaction.
- **Rationale**: FR-015 "newest last". Tie-break keeps "created the task" first when a comment is
  added in the same millisecond, and keeps the order stable across reloads.

## R7. Comment count on board and list

- **Decision**: `listTasks` runs one grouped query
  `SELECT task_id, count(*) FROM comments WHERE task_id IN (...) GROUP BY task_id` and attaches
  `commentCount` to every task, next to the existing label hydration.
- **Rationale**: One query per page load, not one per task (plan performance goal). The value is
  computed, not stored, so it can never drift from the real number (SC-006).
- **Alternatives considered**: A `comment_count` column on `tasks` (denormalized, must be kept in
  sync on every comment change and on migration).

## R8. Passing data to Client Components

- **Decision**: The task page (Server Component) builds timeline items with times already
  formatted by `formatDateTime` and activity sentences already built, then passes plain objects to
  `TaskDetail` → `Timeline`.
- **Rationale**: Props to Client Components must be serializable (Next.js 16 docs,
  `01-app/01-getting-started/05-server-and-client-components.md`). Formatting on the server matches
  how `createdAt`/`updatedAt` are already passed, and avoids hydration differences.

## R9. Server Actions and refresh

- **Decision**: Three actions in `src/app/actions.ts` reuse the existing `run()` helper, which
  returns `{ ok, id } | { ok: false, error }` and calls `revalidatePath("/", "layout")`, so the
  board and list counts refresh too.
- **Rationale**: Same pattern as the task actions (constitution II). Checked against
  `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`: actions are called
  from Client Components by importing from a `"use server"` file, inside `startTransition`.

## R10. Migration safety

- **Decision**: `npm run db:generate -- --name comments_and_activity` produces only two
  `CREATE TABLE` and two `CREATE INDEX` statements. No existing table is altered.
- **Rationale**: FR-019 and SC-005. Existing rows are untouched; old tasks simply have an empty
  history (spec assumption: no back-filled "created" entry).
