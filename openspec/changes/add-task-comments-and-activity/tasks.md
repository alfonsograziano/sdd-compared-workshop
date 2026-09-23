# Tasks

## 1. Database

- [x] 1.1 Add the `comments` and `task_activity` tables to `src/lib/db/schema.ts` (columns, `ON DELETE CASCADE` to `tasks`, index on `(task_id, created_at)`, exported row types) and verify `npm run typecheck` passes
- [x] 1.2 Generate the migration with `npm run db:generate -- --name comments_and_activity` and verify a new file appears in `drizzle/` that only creates tables and indexes, with `0000_init.sql` unchanged
- [x] 1.3 Migrate a copy of a database seeded on master and verify every row in `tasks`, `labels` and `task_labels` is unchanged and both new tables are empty

## 2. Data layer: comments

- [x] 2.1 Add `commentBodySchema` (trimmed, 1 to 20,000 characters) to `src/lib/validation.ts` and verify with a unit test that empty and whitespace-only bodies are rejected
- [x] 2.2 Add `addComment`, `updateComment` (sets `editedAt` only when the body changes) and `deleteComment` to `src/lib/tasks.ts` and verify with unit tests for add, edit, no-op edit, empty edit, delete, and a missing task
- [x] 2.3 Add `commentCount` to the tasks returned by `listTasks` and `getTask` with one grouped query and verify with a unit test that counts are right for tasks with 0, 1 and several comments

## 3. Data layer: activity

- [x] 3.1 Record a `created` entry in `createTask` and verify with a unit test that a new task has exactly one activity entry
- [x] 3.2 Diff title, description, status, priority, labels (as a sorted name list) and due date in `updateTask`, insert one entry per real change, and verify with one unit test per field plus a test that re-saving the same value records nothing
- [x] 3.3 Record a `status` entry in `moveTask` only when the moved task changes column and verify with unit tests for a cross-column move and a same-column reorder
- [x] 3.4 Verify with a unit test that label names in old entries survive deleting the label
- [x] 3.5 Verify with a unit test that deleting a task removes its comments and activity rows (cascade)

## 4. Data layer: timeline

- [x] 4.1 Add `getTimeline(taskId)` that merges comments and activity oldest first with a stable tie-break, and verify with a unit test that created, comment and priority change come back in that order and that editing a comment does not move it
- [x] 4.2 Add `describeActivity` to `src/lib/format.ts` (display names for status and priority, "none" for empty values, formatted due dates, "changed the description", "created the task") and verify with unit tests for every field
- [x] 4.3 Make `seed()` reset the new tables and verify `npm run db:seed` still reports 12 tasks and the seed unit tests pass

## 5. Server Actions and UI

- [ ] 5.1 Add `addCommentAction`, `updateCommentAction` and `deleteCommentAction` to `src/app/actions.ts` (validate ids, return `ActionResult`, revalidate) and verify `npm run typecheck` passes
- [ ] 5.2 Build `src/components/Timeline.tsx` (activity sentences, comments with markdown, time, "edited" marker, edit and delete actions, comment box at the end) and render it under the description on `/tasks/[id]`; verify by opening a task in the dev server
- [ ] 5.3 Show the comment count on `TaskCard` and on list rows only when it is above zero, and verify on `/` and `/list` in the dev server

## 6. Verification

- [ ] 6.1 Add a Playwright spec that adds, edits and deletes a comment, changes the priority and sees "changed priority from … to Urgent", and checks the comment count on the board card and in the list; verify `npm run test:e2e` passes
- [ ] 6.2 Run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` and verify all pass
- [ ] 6.3 Start the built app on port 3052 and verify `/`, `/list` and `/tasks/1` return 200
