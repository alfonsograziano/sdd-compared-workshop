---
title: 'Comments and activity log on tasks'
type: 'feature'
created: '2026-11-16'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-task-comments-and-activity-log/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-task-comments-and-activity-log/activity-entries.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A task page shows only the task's current state. The user cannot leave notes on a task or see what changed, when, and from what (SPEC CAP-1..CAP-7).

**Approach:** Two new tables, `comments` and `task_activity`, cascade-deleted with the task. The data layer writes activity inside the same transaction as every task change, and merges both into one timeline that the task page renders under the description. Board cards and list rows show a comment count.

## Boundaries & Constraints

**Always:** Activity is written only by `createTask`, `updateTask`, `moveTask`, in their transaction. One entry per changed field; nothing for unchanged fields. Store activity values as they were (status/priority keys, `YYYY-MM-DD`, plain text, JSON array of sorted label names). Wording per `activity-entries.md`. Comment body trimmed, 1–20,000 chars. A new migration via `npm run db:generate`, plus a hand-added backfill of one "created" entry per existing task at its `created_at`. Mutations go through Server Actions. Client Components `import type` only from the data layer.

**Never:** Author fields or permissions. Activity for comments. Undo from activity. Editing `drizzle/0000_init.sql`. Route handlers. New dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add comment | body "**hi**" | Timeline shows bold "hi" with written time | N/A |
| Empty comment | body "   " | Nothing saved | Inline error, typed text kept |
| Edit, body changed | "a" → "b" | Body "b", marked "edited" | N/A |
| Edit, same body | "a" → " a " | No "edited" marker | N/A |
| Delete comment | existing comment | Gone after reload | N/A |
| Multi-field save | priority + due date change | Two entries, one per field | N/A |
| No-op save | all values unchanged | No entry | N/A |
| Drag to other column | todo → in_progress | "changed status from Todo to In Progress" | N/A |
| Reorder same column | todo → todo | No entry | N/A |
| Labels change | [Bug] → [Bug, Docs] | "changed labels from Bug to Bug, Docs" | N/A |
| Delete task | task with comments + activity | No rows left in either table | N/A |
| Missing comment/task id | stale id | Action returns `{ ok: false }` | Error shown, no crash |

**Decisions:**
- An edited comment stays where it was written. Timeline order never moves; the "edited" marker shows the change.
- Deleting a comment asks for confirmation with a browser `confirm()`.

</frozen-after-approval>

## Code Map

- `src/lib/db/schema.ts` -- add `comments` (id, taskId FK cascade, body, createdAt, editedAt nullable) and `taskActivity` (id, taskId FK cascade, field nullable = created, oldValue, newValue, createdAt); copy the `timestamp_ms` + `unixepoch('subsec')*1000` default and `.references(..., { onDelete: "cascade" })` style of `tasks`/`task_labels`.
- `drizzle/` -- only `0000_init.sql` exists; generate `0001`, append backfill `INSERT INTO task_activity (task_id, field, created_at) SELECT id, NULL, created_at FROM tasks;`.
- `src/lib/db/index.ts` -- `foreign_keys = ON` already; migrations run on open. No change.
- `src/lib/tasks.ts` -- `Task = TaskRow & { labels }` (L15), `Conn` type (L18), `withLabels` (L21-41: add `commentCount` here), `createTask` (L75), `updateTask` (L104, diff against `current`; titles compared after zod trim), `moveTask` (L131, record only when `status !== current.status`), `deleteTask` (L159, cascade). Not-found is `throw new Error("Task N not found")`.
- `src/lib/comments.ts` (new) -- list/create/update/delete/count comments.
- `src/lib/activity.ts` (new) -- `recordActivity(tx, ...)`, diff helpers, `describeActivity(entry)` → sentence.
- `src/lib/timeline.ts` (new) -- merge comments + activity for one task, oldest first, stable tie order.
- `src/lib/validation.ts` -- add `commentBodySchema` following the field-schema pattern.
- `src/lib/constants.ts` -- `STATUS_LABELS`, `PRIORITY_LABELS` for display. Reuse.
- `src/lib/format.ts` -- `formatDueDate` ("Sep 24"), `formatDateTime`. Reuse.
- `src/app/actions.ts` -- `ActionResult`, `run(fn)` (catches only `ZodError`); add comment actions; make not-found return `{ ok: false }`.
- `src/app/tasks/[id]/page.tsx` -- server page; load timeline, pre-format dates, pass to `TaskDetail`.
- `src/components/TaskDetail.tsx` -- client; render `<Timeline>` after the description block (after L94). Save pattern: `useTransition` + `setError`.
- `src/components/Markdown.tsx` -- reuse for comment bodies.
- `src/components/TaskCard.tsx` (meta row L22-27), `src/app/list/page.tsx` (title cell L65-69) -- comment count.
- `src/components/icons.tsx` -- add a comment icon.
- `src/lib/seed.ts` -- delete new tables first (L125-129); add a couple of demo comments.
- `tests/unit/*.test.ts` (in-memory `createDb(":memory:")`), `tests/e2e/smoke.spec.ts` (port 3100, `data/e2e.db`, wait for `networkidle`).

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/db/schema.ts`, `drizzle/0001_*` -- tables + migration + backfill -- storage for both entry kinds.
- [ ] `src/lib/validation.ts` -- comment body schema -- one validation source.
- [ ] `src/lib/activity.ts` -- record + describe activity per `activity-entries.md` -- single owner of wording.
- [ ] `src/lib/tasks.ts` -- record activity in create/update/move; `commentCount` on `Task` -- every change path covered.
- [ ] `src/lib/comments.ts`, `src/lib/timeline.ts` -- comment CRUD, merged timeline -- data layer stays the only DB access.
- [ ] `src/app/actions.ts` -- create/update/delete comment actions; not-found → `{ ok: false }` -- mutations via actions.
- [ ] `src/components/Timeline.tsx` (new), `TaskDetail.tsx`, `tasks/[id]/page.tsx` -- timeline UI with add/edit/delete; keep typed text on error -- CAP-1..CAP-5.
- [ ] `src/components/TaskCard.tsx`, `src/app/list/page.tsx`, `icons.tsx` -- comment count when > 0 -- CAP-6.
- [ ] `src/lib/seed.ts` -- clear new tables, demo comments.
- [ ] `tests/unit/` -- every I/O matrix row, every field's wording, migration backfill on a pre-existing DB, cascade delete; `tests/e2e/comments.spec.ts` -- add/edit/delete comment, activity after an edit, count on board.

**Acceptance Criteria:**
- Given a database seeded on `master`, when the new migration runs, then tasks, labels and links are unchanged and each task has exactly one "created" entry at its own `created_at`.
- Given any task change through the UI or a board drag, when the page reloads, then the timeline shows it worded per `activity-entries.md`.
- Given a comment and an activity entry, when the timeline renders, then they interleave by time, oldest first.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npm run test` -- expected: all pass
- `npm run test:e2e` -- expected: all pass
