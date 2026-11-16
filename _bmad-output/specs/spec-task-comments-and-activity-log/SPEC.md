---
id: SPEC-task-comments-and-activity-log
companions:
  - activity-entries.md
sources:
  - ../../../docs/FEATURE.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Comments and activity log on tasks

## Why

A pain to solve. The single user of this task manager cannot see what happened to a task or leave notes on it: a task page shows only its current state. Notes and history go in one place, under the description, so the task page answers "what changed, when, and why" without leaving the app.

## Capabilities

- **CAP-1**
  - **intent:** The user can write a markdown comment on a task.
  - **success:** After saving, the comment appears in the task timeline, rendered as markdown, with the time it was written.
- **CAP-2**
  - **intent:** The user can edit a comment.
  - **success:** The new body is shown and the comment is marked "edited". A comment whose body never changed has no marker.
- **CAP-3**
  - **intent:** The user can delete a comment.
  - **success:** The comment is gone from the timeline, also after a reload.
- **CAP-4**
  - **intent:** Every change to a task is recorded without user action: creation, and any change to title, description, status, priority, labels or due date.
  - **success:** Each change yields one entry that says what changed, from what to what, and when, worded per `activity-entries.md` (e.g. "changed priority from Medium to Urgent").
- **CAP-5**
  - **intent:** The task page shows one timeline under the description that mixes comments and activity.
  - **success:** Entries of both kinds interleave in time order, oldest first, newest last.
- **CAP-6**
  - **intent:** Board cards and list rows show how many comments a task has.
  - **success:** A task with comments shows its count; a task with none shows nothing.
- **CAP-7**
  - **intent:** Deleting a task deletes its comments and its activity.
  - **success:** After the delete, no comment or activity row for that task remains.

## Constraints

- One user. No author field, no permissions: "my own comment" means any comment.
- Recording cannot depend on the caller remembering to do it. Every path that changes a task, including a board drag to another column, produces activity.
- Existing tasks, labels and task-label links survive the migration unchanged. Each existing task gets one "created" entry dated at its own creation time.
- Comment body: 1 to 20,000 characters after trimming. An empty comment is rejected.

## Non-goals

- Notifications, mentions, reactions, threaded replies, attachments.
- Activity entries for comments. Only the six task fields and creation are tracked.
- Undo or restore from the activity log. It is read-only history.

## Success signal

- Open a task, change its priority from Medium to Urgent, add a comment, edit it, then drag the card to another column: the timeline shows, in order, "created", "changed priority from Medium to Urgent", the comment marked "edited", and the status change; the board card shows a count of 1. Delete the task and no comment or activity rows remain.

## Assumptions

- The migration-safety constraint is inferred, not stated: the app is brownfield and holds real tasks.
