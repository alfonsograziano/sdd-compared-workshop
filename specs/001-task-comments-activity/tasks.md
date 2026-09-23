---

description: "Task list for Task Comments and Activity Log"
---

# Tasks: Task Comments and Activity Log

**Input**: Design documents from `/specs/001-task-comments-activity/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included. The spec does not ask for tests, but constitution principle IV (NON-NEGOTIABLE) requires a unit test for every new data-layer function and an e2e test for every new user flow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Next.js project: `src/`, `tests/`, `drizzle/` at the repository root (see plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the starting point is green before changing anything

- [X] T001 Run `npm install`, `npm run lint`, `npm run typecheck` and `npm run test` on the unchanged code and confirm all pass

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tables, migration and validation that every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add the `comments` table to `src/lib/db/schema.ts`: `id` integer primary key autoincrement; `task_id` integer not null, FK → `tasks.id`, `ON DELETE CASCADE`; `body` text not null; `created_at` integer (`timestamp_ms`) not null, default `unixepoch('subsec') * 1000`; `updated_at` integer (`timestamp_ms`), null ("null until an edit changes the body"); index `comments_task_id_idx` on (`task_id`); export `Comment` type
- [X] T003 Add the `task_activity` table to `src/lib/db/schema.ts`: `id` integer primary key autoincrement; `task_id` integer not null, FK → `tasks.id`, `ON DELETE CASCADE`; `field` text null, "one of `title`, `description`, `status`, `priority`, `labels`, `due_date`; null means 'created the task'"; `old_value` text null; `new_value` text null; `created_at` integer (`timestamp_ms`) not null, default `unixepoch('subsec') * 1000`; index `task_activity_task_id_idx` on (`task_id`); export `ACTIVITY_FIELDS`, `ActivityField` and `Activity` types
- [X] T004 Generate the migration with `npm run db:generate -- --name comments_and_activity` and check that `drizzle/0001_comments_and_activity.sql` contains only `CREATE TABLE` and `CREATE INDEX` statements (no change to existing tables)
- [X] T005 [P] Add `commentBodySchema = z.string().trim().min(1, "Comment cannot be empty").max(10_000, "Comment is too long (max 10,000 characters)")` to `src/lib/validation.ts`
- [X] T006 Verify that a database created on the old schema keeps its tasks, labels and label links after the new migration runs (quickstart.md step 1)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Discuss a task with comments (Priority: P1) 🎯 MVP

**Goal**: Add, edit and delete markdown comments on a task, shown in a timeline under the description

**Independent Test**: Open any task, add a comment, edit it, reload, delete it; each step shows in the timeline and survives a reload

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [P] [US1] Unit tests for `listComments`, `createComment`, `updateComment`, `deleteComment` in `tests/unit/comments.test.ts`: trims body; rejects empty/whitespace and >10,000 chars; throws for a missing task or comment; `updatedAt` stays null on create and when saving the same text, is set when the body changes; `createdAt` never changes; list is oldest first; delete of a missing id is a no-op
- [ ] T008 [P] [US1] Unit tests for `mergeTimeline` in `tests/unit/timeline.test.ts`: sorted by time ascending, activity before comment on the same time, then by id
- [ ] T009 [P] [US1] E2E test in `tests/e2e/comments.spec.ts`: open a task, add a comment with `Needs **review**` (bold renders), edit it (shows "edited"), reload (still there), delete it with confirm (gone after reload)

### Implementation for User Story 1

- [ ] T010 [US1] Implement `listComments`, `createComment`, `updateComment`, `deleteComment` in `src/lib/comments.ts`, each with an optional `db` argument, parsing the body with `commentBodySchema` (contracts/server-actions.md)
- [ ] T011 [US1] Implement the `TimelineItem` type, `mergeTimeline` and `getTimeline` in `src/lib/timeline.ts` (comments only for now; activity is added in US2)
- [ ] T012 [US1] Add `createCommentAction(taskId, body)`, `updateCommentAction(id, body)` and `deleteCommentAction(id)` to `src/app/actions.ts`, validating ids with zod and reusing `run()`
- [ ] T013 [US1] Create the `Timeline` Client Component in `src/components/Timeline.tsx`: ordered list `aria-label="Timeline"`, comment entries with time, "edited" marker (focusable, `title`/`aria-label` "Edited <time>"), rendered markdown, "Edit comment" and "Delete comment" buttons, inline edit with "Save"/"Cancel", `confirm("Delete this comment?")`, and the "New comment" form with a "Comment" button that stays enabled; a validation error from the action (for example "Comment cannot be empty") is shown under the form (contracts/ui.md, FR-002)
- [ ] T014 [US1] Load the timeline in `src/app/tasks/[id]/page.tsx`, map it to a serializable view model with `formatDateTime`, and render `<Timeline>` under the description in `src/components/TaskDetail.tsx`

**Checkpoint**: User Story 1 is fully functional and testable on its own

---

## Phase 4: User Story 2 - See what changed on a task (Priority: P2)

**Goal**: Every create and every change to title, description, status, priority, labels or due date is recorded and shown in the timeline

**Independent Test**: Create a task, change each tracked field, open it: "created the task" then one entry per change, in order, with old and new values

### Tests for User Story 2 ⚠️

- [ ] T015 [P] [US2] Unit tests in `tests/unit/activity.test.ts`: `createTask` records one entry with `field` null; `updateTask` records one entry per changed field for each of title, description, status, priority, labels (sorted JSON array of names) and due_date (null ↔ date); saving the same values records nothing; labels in a different order record nothing; `moveTask` to another column records a status entry; reorder in the same column records nothing; `listActivity` is oldest first
- [ ] T016 [P] [US2] Unit tests for `describeActivity` in `tests/unit/activity.test.ts`: "created the task"; "changed priority from Medium to Urgent"; "changed status from Todo to In Progress"; title in quotes; "changed due date from no due date to <date>" and back; "added label Docs and removed label Bug"; description returns "changed the description" with old/new details
- [ ] T017 [P] [US2] Extend `tests/e2e/comments.spec.ts`: change the priority on the task page and see "changed priority from … to Urgent" in the timeline

### Implementation for User Story 2

- [ ] T018 [US2] Implement `recordActivity(conn, taskId, entries, at)`, `listActivity(taskId)` and the pure `describeActivity(entry)` in `src/lib/activity.ts`, using `STATUS_LABELS`, `PRIORITY_LABELS` and `formatDueDate` for display (data-model.md value encoding)
- [ ] T019 [US2] Record activity in `createTask`, `updateTask` and `moveTask` in `src/lib/tasks.ts`, inside their existing transactions, comparing old and new values so unchanged fields record nothing (research R1, R4)
- [ ] T020 [US2] Include activity in `getTimeline` in `src/lib/timeline.ts`
- [ ] T021 [US2] Render activity entries in `src/components/Timeline.tsx`: one muted line with the sentence and time; description changes as `<details>` with "Before"/"After" blocks; page view model in `src/app/tasks/[id]/page.tsx` carries the sentence and details

**Checkpoint**: User Stories 1 and 2 both work on their own

---

## Phase 5: User Story 3 - Spot discussed tasks on the board and list (Priority: P3)

**Goal**: Board cards and list rows show the comment count when it is above zero

**Independent Test**: Add two comments to one task; the board and list show "2" for it and nothing for a task with no comments

### Tests for User Story 3 ⚠️

- [ ] T022 [P] [US3] Unit tests in `tests/unit/comments.test.ts` for `countComments` and for `commentCount` on `listTasks` and `getTask` (0 by default, updates after create and delete)
- [ ] T023 [P] [US3] Extend `tests/e2e/comments.spec.ts`: after adding a comment, the board card and the list view row both show a comment count of 1 (constitution IV: every changed user flow has e2e coverage)

### Implementation for User Story 3

- [ ] T024 [US3] Implement `countComments(taskIds)` in `src/lib/comments.ts` (one grouped query) and add `commentCount` to the `Task` type and to `listTasks`/`getTask` in `src/lib/tasks.ts`
- [ ] T025 [P] [US3] Add `CommentIcon` to `src/components/icons.tsx` and create `src/components/CommentCount.tsx` (renders nothing for 0; `aria-label="<n> comment(s)"`, `data-testid="comment-count"`)
- [ ] T026 [US3] Show `CommentCount` on board cards in `src/components/TaskCard.tsx` and next to the title in `src/app/list/page.tsx`

**Checkpoint**: All user stories so far work on their own

---

## Phase 6: User Story 4 - Deleting a task removes its history (Priority: P3)

**Goal**: Deleting a task removes its comments and activity, and nothing else

**Independent Test**: Give a task comments and activity, delete it, check no rows remain for it and another task is untouched

### Tests for User Story 4 ⚠️

- [ ] T027 [US4] Unit test in `tests/unit/comments.test.ts`: `deleteTask` removes the task's comments and activity rows through the cascade, and leaves another task's comments and activity in place

### Implementation for User Story 4

- [ ] T028 [US4] Confirm `deleteTask` in `src/lib/tasks.ts` needs no code change (cascade), update its comment, and make sure `seed()` in `src/lib/seed.ts` still clears everything (cascade from `tasks`)

**Checkpoint**: All user stories are complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Demo data, docs and full verification

- [ ] T029 [P] Add two demo comments to one seeded task in `src/lib/seed.ts` so the board shows a count out of the box
- [ ] T030 [P] Update the data model and folder map in `README.md` and the architecture list in `CLAUDE.md` for the new tables and modules
- [ ] T031 Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` and `npm run test:e2e`; all must pass
- [ ] T032 Run quickstart.md validation, including the migration check and a manual start of the app

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential in priority order (P1 → P2 → P3) for one developer
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational. Shares `src/lib/timeline.ts` and `src/components/Timeline.tsx` with US1, so T020–T021 come after T011–T014
- **User Story 3 (P3)**: Can start after Foundational. Needs `createComment` (T010) to have data to count
- **User Story 4 (P3)**: Can start after Foundational. Its test uses `createComment` (T010) and activity recording (T019)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Data layer before Server Actions
- Server Actions before UI
- Story complete before moving to next priority

### Parallel Opportunities

- T005 can run next to T002–T004
- Test tasks marked [P] in a story can be written in parallel
- T025 (icon and component) can run next to T024

---

## Parallel Example: User Story 1

```bash
# Write all tests for User Story 1 together:
Task: "Unit tests for comments in tests/unit/comments.test.ts"
Task: "Unit tests for mergeTimeline in tests/unit/timeline.test.ts"
Task: "E2E test for add/edit/delete comment in tests/e2e/comments.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → test → demo (MVP)
3. User Story 2 → test → demo
4. User Story 3 → test → demo
5. User Story 4 → test
6. Polish → full gate run

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
