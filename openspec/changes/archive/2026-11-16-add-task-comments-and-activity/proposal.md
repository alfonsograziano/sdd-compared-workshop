# Proposal

## Why

Today a task only shows its current state. There is no way to leave a note on a task, and no way to see how the task got to where it is (who moved it, when the priority went up, what the due date used to be). Adding comments and an automatic activity log gives each task a history, which is the main thing a Linear-style tracker offers on top of a plain list.

## What Changes

- New `comments` table: one row per comment on a task, with a markdown body, a creation time and an optional "edited" time. Comments can be added, edited and deleted from the task detail page.
- New `task_activity` table: one row per recorded change to a task. The data layer writes these rows itself, inside the same transaction as the change, so every path that changes a task (detail page form, board drag and drop, create dialog) is covered without the user doing anything.
- Tracked events: task created, and changes to title, description, status, priority, labels and due date. Each entry stores what changed, the old value and the new value, and when.
- The task detail page shows one timeline under the description that mixes comments and activity entries, oldest first (newest last), with a form to write a new comment at the bottom.
- Board cards and list rows show the number of comments on a task when it has at least one.
- Deleting a task also deletes its comments and activity (database `ON DELETE CASCADE`).
- One new drizzle-kit migration. Existing tasks, labels and label links are left untouched. No backfill: tasks that exist before the migration start with an empty timeline.
- No author field and no permissions, because the app has one user.

## Capabilities

### New Capabilities
- `task-comments`: writing, editing and deleting markdown comments on a task, the "edited" marker, and the comment count shown on the board and in the list.
- `task-activity`: the automatic log of changes to a task (created, title, description, status, priority, labels, due date), what each entry records, and which changes are not recorded.
- `task-timeline`: the single timeline on the task detail page that merges comments and activity in time order, and how each kind of entry is shown.

### Modified Capabilities
<!-- None. openspec/specs/ is empty on master, so there is no existing capability to modify. -->

## Impact

- Database: `src/lib/db/schema.ts` gains two tables; a new migration in `drizzle/`; `src/lib/seed.ts` resets the new tables too.
- Data layer: `src/lib/tasks.ts` gains comment and activity functions, and `createTask`, `updateTask` and `moveTask` start writing activity rows. `listTasks` and `getTask` return a comment count.
- Validation: `src/lib/validation.ts` gains a comment schema.
- Server Actions: `src/app/actions.ts` gains create, update and delete comment actions.
- UI: new timeline component on the task detail page; `TaskCard` and the list page show the comment count; small formatting helpers in `src/lib/format.ts`.
- Tests: new Vitest unit tests for the data layer and helpers, and a new Playwright e2e spec.
- No new dependencies. Markdown is rendered with the existing `react-markdown` component.
