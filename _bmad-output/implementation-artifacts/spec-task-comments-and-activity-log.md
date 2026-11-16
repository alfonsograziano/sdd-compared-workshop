---
title: 'Comments and activity log on tasks'
type: 'feature'
created: '2026-11-16'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '34075e85037435b902a4e3649ee12e37bc1c9881'
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
- [x] `src/lib/db/schema.ts`, `drizzle/0001_*` -- tables + migration + backfill -- storage for both entry kinds.
- [x] `src/lib/validation.ts` -- comment body schema -- one validation source.
- [x] `src/lib/activity.ts` -- record + describe activity per `activity-entries.md` -- single owner of wording.
- [x] `src/lib/tasks.ts` -- record activity in create/update/move; `commentCount` on `Task` -- every change path covered.
- [x] `src/lib/comments.ts`, `src/lib/timeline.ts` -- comment CRUD, merged timeline -- data layer stays the only DB access.
- [x] `src/app/actions.ts` -- create/update/delete comment actions; not-found → `{ ok: false }` -- mutations via actions.
- [x] `src/components/Timeline.tsx` (new), `TaskDetail.tsx`, `tasks/[id]/page.tsx` -- timeline UI with add/edit/delete; keep typed text on error -- CAP-1..CAP-5.
- [x] `src/components/TaskCard.tsx`, `src/app/list/page.tsx`, `icons.tsx` -- comment count when > 0 -- CAP-6.
- [x] `src/lib/seed.ts` -- clear new tables, demo comments.
- [x] `tests/unit/` -- every I/O matrix row, every field's wording, migration backfill on a pre-existing DB, cascade delete; `tests/e2e/comments.spec.ts` -- add/edit/delete comment, activity after an edit, count on board.

**Acceptance Criteria:**
- Given a database seeded on `master`, when the new migration runs, then tasks, labels and links are unchanged and each task has exactly one "created" entry at its own `created_at`.
- Given any task change through the UI or a board drag, when the page reloads, then the timeline shows it worded per `activity-entries.md`.
- Given a comment and an activity entry, when the timeline renders, then they interleave by time, oldest first.

## Implementation Notes

- Implementation subagent ran from the spec alone (about 7.5 minutes). Lint, typecheck and 57 unit tests pass.
- Beyond the Code Map: `Conn` type moved to `src/lib/db/index.ts` (type only) so `activity.ts`, `comments.ts` and `timeline.ts` can take a transaction; new `src/lib/errors.ts` holds `NotFoundError`, which `run()` in `actions.ts` turns into `{ ok: false }` for task and comment actions.
- `updateTask` diffs a snapshot of the task before and after the save, inside the transaction. Title compared after zod trims it; label sets compared as sorted names.
- Timeline ties: activity before comments, then by id.
- Seed adds 3 demo comments (2 on TSK-1, 1 on TSK-5).
- e2e ran in a copy of the tree: a `next dev` was already running in this folder on :3000, and Next refuses a second dev server in the same folder.

## Spec Change Log

## Review Triage Log

Pass 1 (review_loop_iteration 0). Layers: Blind Hunter (BH, 15 findings, floor 9), Edge Case Hunter (ECH, 7), Verification Gap (VG, 1). No intent_gap or bad_spec, so no loopback.

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | VG | List-row comment count has no test | medium | Pre-verified gap: no test opens `/list`; removing `<CommentCount>` there fails nothing | patch |
| 2 | BH | Same as #1 | medium | Same root cause as #1 | patch (with #1) |
| 3 | BH | No e2e drags a card to another column, though an AC names the board drag | low | `comments.spec.ts` changes status only via the form; `moveTask` activity is unit-tested only | patch |
| 4 | BH | README not updated for the new modules and tables | low | Folder map and "How it works" still name only `tasks.ts` | patch |
| 5 | BH | `aria-label` on a role-less `<span>` in `CommentCount` | low | ARIA does not name generic elements; count reads as a bare number | patch |
| 6 | BH | Long activity text truncated with no way to read it | low | `ActivityRow` uses `truncate`, no title; a 200-char title change is clipped | patch |
| 7 | ECH | Same as #6 | low | Same root cause as #6 | patch (with #6) |
| 8 | BH | Edit button enabled while a delete is pending | low | Only Delete has `disabled={pending}` | patch |
| 9 | ECH | Same as #8 | low | Same root cause as #8 | patch (with #8) |
| 10 | BH | Every comment's buttons named just "Edit"/"Delete" | low | Screen readers list identical controls | patch |
| 11 | ECH | Text typed while a new comment saves is erased on success | low | `setBody("")` clears whatever is in the box after the await | patch |
| 12 | ECH | Edits typed while an edit saves are dropped when the editor closes | low | `setEditing(false)` after the await; draft is discarded | patch (with #11, readOnly while pending) |
| 13 | BH | Visible heading "Activity" vs `aria-label` "Timeline" | low | Two names for one region | patch |
| 14 | BH | `withLabels` also attaches comment counts; name misleads | low | Developer harm: next reader of `tasks.ts` misses the count query | patch |
| 15 | BH | `createCommentAction` calls its task-id parameter `id` | low | Sibling actions use `id` for a comment id; easy to pass the wrong one | patch |
| 16 | BH | Malformed labels JSON crashes the task page | low | Only writer is `recordActivity` via `JSON.stringify`; needs a hand-edited DB, fix adds a guard | reject |
| 17 | ECH | Same as #16 | low | Same as #16 | reject |
| 18 | ECH | `field` outside `ACTIVITY_FIELDS` makes `describeActivity` return undefined | low | Only typed writer is `recordActivity`; needs a hand-edited DB, fix adds a branch | reject |
| 19 | BH | Escape does not cancel a comment edit | false | Not a defect: Cancel button exists; nothing in the intent asks for a key binding | reject |
| 20 | BH | Stale comment stays on screen after a not-found update/delete | false | Matrix row "Missing comment/task id" asks for `{ ok: false }` and an error shown, which is what happens | reject |
| 21 | BH | Implementation Notes do not record an e2e result | low | Fix edits this build's spec | reject |
| 22 | BH | `updateTask` runs two extra comment-count queries | low | Local SQLite, one task, sub-millisecond; fix adds a second loader | reject |
| 23 | ECH | Board ignores `moveTaskAction`'s result: a drag of a task deleted elsewhere leaves a ghost card, no error | low | `Board.tsx` ignored the result before this change too (`master`); needs two tabs | defer |


## Verification

**Commands:**
- `npm run lint` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npm run test` -- expected: all pass
- `npm run test:e2e` -- expected: all pass
