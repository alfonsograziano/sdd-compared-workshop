---
title: 'Comments and activity log on tasks'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b7422cafadf8d027c9c01b46a3b0deb4dbb01217'
context:
  - '{project-root}/CLAUDE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A task has no history. The user cannot leave notes on a task, and cannot see what changed on it, from what to what, or when.

**Approach:** Add a `comments` table and an `activities` table, both owned by a task with ON DELETE CASCADE. The data layer writes an activity row inside the same transaction as every task create and every real field change. The task detail page shows one timeline under the description that merges comments and activities, oldest first (newest last). Board cards and list rows show the comment count when it is above zero.

## Boundaries & Constraints

**Always:** Comments are markdown, rendered with the existing `Markdown` component. A comment can be added, edited and deleted; it shows its created time and an "edited" marker once its body changed. Activity is recorded for: task created, and changes to title, description, status, priority, labels and due date. Each activity entry says what changed, from what to what, and when (e.g. "changed priority from Medium to Urgent"). A status change made by dragging on the board is recorded too. A save that changes nothing records nothing. Deleting a task deletes its comments and activities. All mutations go through Server Actions and all DB access stays in the data layer with an optional `db` argument. The schema change is a new drizzle-kit migration; existing rows survive it.

**Never:** No author field, no users, no permissions. No route handlers. No editing of old migrations. No new dependencies. No activity entry for reordering inside the same column, and none for comment add/edit/delete (comments are their own entries).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add comment | body "Looks **good**" | comment row, shown last in timeline, rendered as markdown | N/A |
| Empty comment | body "   " | nothing saved | zod error returned to the form |
| Edit comment, same body | body unchanged | no "edited" marker | N/A |
| Edit comment | new body | body updated, "edited" shown | unknown id → not found error |
| Priority change | medium → urgent | activity "changed priority from Medium to Urgent" | N/A |
| No-op save | title blurred unchanged / same labels | no activity | N/A |
| Due date cleared | 2026-09-24 → null | "changed due date from Sep 24 to none" | N/A |
| Drag to other column | todo → done | "changed status from Todo to Done" | N/A |
| Drag inside column | same status | no activity | N/A |
| Delete task | task with comments + activity | all its rows gone | N/A |

## Decisions

- **Description changes** read as one short line, "changed the description", with no text. The old and new text are still stored, but not shown. (Human answer to open question 1, option A.)
- **Existing tasks** get one backfilled "created" activity each, dated at their `created_at`, written by the new migration. (Human answer to open question 2, option A.)
- **Scope** stays as one spec even though it is above 1600 tokens: comments and activity share one timeline, so splitting would ship half a timeline. (Human answer to the token-count gate: keep full spec.)

</frozen-after-approval>

## Code Map

- `src/lib/db/schema.ts` -- add `comments` (id, taskId FK cascade, body, createdAt, editedAt nullable) and `activities` (id, taskId FK cascade, field, fromValue, toValue, createdAt); timestamps as `timestamp_ms` like `tasks`.
- `drizzle/` -- new migration via `npm run db:generate -- --name comments_and_activity`; never touch `0000_init.sql`.
- `src/lib/db/index.ts` -- already sets `foreign_keys = ON` and runs migrations on open; no change.
- `src/lib/tasks.ts` -- `createTask`, `updateTask` (reads `current` first, partial input), `moveTask` (can change status), `deleteTask` (cascade), private `withLabels`, `setLabels`, `Conn` type. Reuse `current` for diffs.
- `src/lib/validation.ts` -- add comment body schema next to `createTaskSchema`.
- `src/lib/constants.ts` -- `STATUS_LABELS`, `PRIORITY_LABELS` for display names.
- `src/lib/format.ts` -- `formatDueDate`, `formatDateTime`; add the pure activity-sentence helper here.
- `src/app/actions.ts` -- `run()` helper, `taskId` zod id; add comment actions the same way.
- `src/components/TaskDetail.tsx` -- client; timeline goes after the description block inside `div.mx-auto.max-w-3xl`.
- `src/app/tasks/[id]/page.tsx` -- server page; load timeline and pass it down.
- `src/components/TaskCard.tsx`, `src/app/list/page.tsx` -- where the comment count goes.
- `src/components/Markdown.tsx` -- reuse for comment bodies.
- `src/lib/seed.ts` -- creates tasks through `createTask`, so seeds get "created" entries.
- `tests/unit/tasks.test.ts`, `tests/e2e/smoke.spec.ts` -- existing tests must keep passing (seed has 12 tasks, delete test expects 11).

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/db/schema.ts` + `drizzle/` -- add the two tables, generate the migration -- storage.
- [x] `src/lib/validation.ts` -- `commentBodySchema` (trimmed, 1–10000 chars) -- input checks.
- [x] `src/lib/tasks.ts` -- record activities in `createTask`/`updateTask`/`moveTask` only for real changes; add `addComment`, `updateComment`, `deleteComment`, `getTimeline(taskId)`; add `commentCount` to `Task` -- data layer.
- [x] `src/lib/format.ts` -- `describeActivity(entry)` returns the sentence -- display text in one place.
- [x] `src/app/actions.ts` -- `addCommentAction`, `updateCommentAction`, `deleteCommentAction` -- mutations.
- [x] `src/app/tasks/[id]/page.tsx` + new `src/components/Timeline.tsx` -- timeline UI with comment form, edit and delete -- detail page.
- [x] `src/components/TaskCard.tsx`, `src/app/list/page.tsx` -- comment count when > 0 -- board and list.
- [x] `tests/unit/tasks.test.ts`, `tests/unit/format.test.ts` -- cover the I/O matrix -- unit tests.
- [x] `tests/e2e/comments.spec.ts` -- add/edit/delete comment, change priority and see activity, count on board and list -- e2e.

**Acceptance Criteria:**
- Given a task with a comment and two changes, when I open it, then the timeline under the description lists the "created" entry, the changes and the comment in time order, newest last.
- Given a task with 2 comments, when I view the board or the list, then its card and row show "2"; given 0 comments, nothing is shown.
- Given the database from `master`, when the new migration runs, then every existing task, label and task-label row is unchanged.

## Implementation Notes

- The backfill `INSERT ... SELECT` is appended by hand to the generated `drizzle/0001_comments_and_activity.sql`, after a statement breakpoint. Checked on a copy of the `master` database: tasks, labels and task_labels are byte-identical after the migration, and each of the 12 tasks has one "created" entry at its `created_at`. `tests/unit/migration.test.ts` covers the same thing.
- A no-op `updateTask` now returns the task without writing, so `updatedAt` no longer moves on a save that changes nothing.
- Missing task/comment ids throw a new `NotFoundError`; `run()` in `actions.ts` turns it into `{ ok: false, error }` so forms can show it (it used to be rethrown for `updateTaskAction` too).
- Labels are compared as sets of ids; stored values are label names sorted by name, joined by ", ", or null for none. `describeActivity` shows null as "none".
- Timeline sort: each table is read in (createdAt, id) order, then merged with a stable sort on createdAt; on a tie, activity comes before comment.

## Spec Change Log

## Review Triage Log

Review pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | BH, EC | Comment and edit forms lose the typed text when the save fails, because React 19 resets a `<form action>` after the action | medium | `Timeline.tsx` handlers start their own transition and return at once, so the automatic reset runs on success and on failure alike; the textareas are uncontrolled | patch |
| 2 | EC | Failed edit resets the edit textarea to the old body | medium | Same root cause as #1 (grouped) | patch |
| 3 | BH, EC | `deleteComment` returns ok for a missing id | low | True, but only reachable by deleting in two tabs; fix adds a guard. Rejected under the low-and-unlikely rule | reject |
| 4 | BH | New e2e task can break the smoke test counts | false | Playwright runs 1 worker; smoke only counts cards after searching "smoke test", which the comments task title does not match; both specs passed together | reject |
| 5 | BH | Drag rows of the matrix only unit-tested | false | Board calls `moveTaskAction` → `moveTask`, which logs the status change; the unit test covers `moveTask` and the smoke test covers the drag. No bad outcome | reject |
| 6 | BH, VG | Missing-id tests match `/not found/` only, so `run()`'s `NotFoundError` contract is unpinned; no test for `updateTask`/`moveTask` missing id | low | Pre-verified by VG: a plain `Error` would still pass. Fix is a direct test correction | patch |
| 7 | BH | `updateTask` reads the task up to three times | low | Real but invisible at this size (12 tasks, SQLite in process). Rejected: negligible harm | reject |
| 8 | BH, EC | Due-date entry drops the year ("Sep 24 to Sep 24" when only the year changes) | low | Real for a year-only change, which is rare; the frozen matrix fixes the "Sep 24" format and the fix adds a branch. Rejected under the low-and-unlikely rule | reject |
| 9 | BH | Comments use the SQLite clock, activities the JS clock | low | Same machine clock; `tasks` already uses the same default. Ordering is unaffected in practice. Rejected: negligible | reject |
| 10 | BH | Subjectless wording, heading "Activity" also holds comments | false | Wording follows the frozen example "changed priority from Medium to Urgent"; a single "Activity" section holding comments is the Linear convention the app copies | reject |
| 11 | BH | Edit/Delete buttons have no distinct accessible name | low | Screen-reader users meet it on every comment; fix is two `aria-label` attributes | patch |
| 12 | BH, EC | `activities.field` has no CHECK; unknown field renders blank | low | Only the data layer writes the table, with the typed union; no path reaches an unknown value. Rejected | reject |
| 13 | BH | A comment does not bump the task's `updatedAt` | false | "Updated" shows the last change to task fields; the intent treats comments as separate entries, not task changes | reject |
| 14 | BH | Spec document gaps | false | Fix would edit this build's spec; rejected by rule | reject |
| 15 | EC | Label names with ", " cannot be split back | false | Nothing ever splits the stored string; `describeActivity` shows it as is, and the app has no UI to create labels | reject |
| 16 | VG | Cross-table tie rule (activity before comment) is not pinned by a test | low | Pre-verified by VG; ties across tables need the same millisecond. Filed disposition: defer | defer |
| 17 | VG | Board ignores a `{ ok: false }` from `moveTaskAction` for a missing task | low | Only reachable after the task is deleted elsewhere; fix adds error handling to the board. Rejected under the low-and-unlikely rule | reject |

## Design Notes

Store raw values (`medium`, `2026-09-24`, label names joined by ", ") in `fromValue`/`toValue` and turn them into words at display time, so renaming a display label does not rewrite history. Order the timeline by `createdAt`, then by id, so entries written in the same millisecond keep insert order.

## Verification

**Commands:**
- `npm run lint` -- expected: no errors
- `npm run typecheck` -- expected: no errors
- `npm run test` -- expected: all pass
- `npm run test:e2e` -- expected: all pass
- `npm run build` -- expected: success
