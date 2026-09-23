# Feature Specification: Task Comments and Activity Log

**Feature Branch**: `spec-kit` (spec directory `specs/001-task-comments-activity`)

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Add comments and an activity log to tasks.

When I open a task, I want to see one timeline under the description. The timeline mixes two kinds of entries, newest last:

- **Comments.** I can write a comment in markdown, edit my own comment, and delete it. Each comment shows when it was written and marks it as "edited" if it changed.
- **Activity.** Every change to a task is recorded on its own, without me doing anything: the task was created, and any change to its title, description, status, priority, labels or due date. Each entry says what changed, from what to what, and when. For example: "changed priority from Medium to Urgent".

On the board and in the list, each task shows how many comments it has, if it has any.

Deleting a task deletes its comments and its activity. There is only one user, so there is no author field and no permissions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discuss a task with comments (Priority: P1)

While looking at a task, I write a comment in markdown to capture a thought, a decision or a
status note. Later I can fix a typo in it or remove it. The comment appears in a timeline under
the task description, shows when it was written, and says "edited" once I have changed it.

**Why this priority**: Comments are the only part of the feature that holds new information the
user types. Without them the timeline has nothing the user wrote; with them alone the feature
already delivers value.

**Independent Test**: Open any task, add a comment, edit it, reload the page, then delete it.
Each step is visible in the timeline and survives a reload.

**Acceptance Scenarios**:

1. **Given** a task with no comments, **When** I write "Needs **review**" and submit it, **Then**
   the timeline shows the comment with "review" in bold and the time it was written.
2. **Given** a comment on a task, **When** I edit its text and save, **Then** the timeline shows
   the new text and an "edited" marker, and the original written time is unchanged.
3. **Given** a comment on a task, **When** I delete it and confirm, **Then** it no longer appears
   in the timeline, also after a reload.
4. **Given** I start writing or editing a comment, **When** I cancel, **Then** nothing is saved or
   changed.
5. **Given** an empty or whitespace-only comment, **When** I try to submit it, **Then** it is not
   saved and I see why.

---

### User Story 2 - See what changed on a task (Priority: P2)

When I open a task, the same timeline shows every change made to it, recorded automatically:
when the task was created, and every change to its title, description, status, priority, labels
or due date. Each entry says what changed, from what to what, and when, for example "changed
priority from Medium to Urgent". Comments and activity are mixed in one list, oldest first and
newest last.

**Why this priority**: The history answers "how did this task get here?" without any effort from
the user. It depends on nothing the user types, but it is less critical than being able to write
comments.

**Independent Test**: Create a task, change its priority, status, labels and due date, rename it
and edit its description, then open it: the timeline lists "created the task" followed by one
entry per change, in order, each with its old and new value and a time.

**Acceptance Scenarios**:

1. **Given** I create a new task, **When** I open it, **Then** the timeline starts with an entry
   saying the task was created, with the time.
2. **Given** a task with priority Medium, **When** I change the priority to Urgent, **Then** the
   timeline ends with "changed priority from Medium to Urgent" and the time.
3. **Given** a task in Todo, **When** I drag it to In Progress on the board, **Then** its
   timeline shows "changed status from Todo to In Progress".
4. **Given** a task with label Bug, **When** I add the label Docs and remove Bug, **Then** the
   timeline shows which labels were added and which were removed.
5. **Given** a task with no due date, **When** I set one, **Then** the timeline shows the change
   from "no due date" to the new date; clearing it later shows the reverse.
6. **Given** a task, **When** I rename it, **Then** the timeline shows the old and the new title.
7. **Given** a task, **When** I edit its description, **Then** the timeline shows an entry saying
   the description changed, and I can see the old and the new text.
8. **Given** a task, **When** I save a field with the same value it already had, or I only
   reorder the card inside its column, **Then** no activity entry is added.
9. **Given** a task with comments and activity, **When** I open it, **Then** comments and activity
   appear in one list ordered by time, newest last.

---

### User Story 3 - Spot discussed tasks on the board and list (Priority: P3)

On the board and in the list view, each task that has comments shows how many it has. Tasks with
no comments show nothing extra.

**Why this priority**: A useful signal when scanning many tasks, but only once comments exist.

**Independent Test**: Add two comments to one task, then look at the board and the list: that task
shows "2", and a task with no comments shows no count.

**Acceptance Scenarios**:

1. **Given** a task with 2 comments, **When** I view the board, **Then** its card shows a comment
   count of 2.
2. **Given** a task with 2 comments, **When** I view the list, **Then** its row shows a comment
   count of 2.
3. **Given** a task with no comments, **When** I view the board or the list, **Then** no comment
   count is shown for it.
4. **Given** a task with 1 comment, **When** I delete that comment, **Then** the count disappears
   from the board and the list.

---

### User Story 4 - Deleting a task removes its history (Priority: P3)

When I delete a task, its comments and its activity are deleted with it. Nothing is left behind.

**Why this priority**: Required for data hygiene, but it is not visible in daily use.

**Independent Test**: Give a task comments and activity, delete it, and check that no comment or
activity entry for it remains.

**Acceptance Scenarios**:

1. **Given** a task with comments and activity, **When** I delete the task, **Then** its comments
   and its activity entries no longer exist.
2. **Given** two tasks with comments, **When** I delete one of them, **Then** the other task's
   comments and activity are untouched.

---

### Edge Cases

- A comment made only of spaces or new lines is rejected with a message.
- A very long comment: comments up to 10,000 characters are accepted; longer ones are rejected
  with a message.
- Editing a comment and saving the exact same text does not mark it "edited".
- Several fields changed in one save (for example when a form sends two fields at once) produce
  one activity entry per field that really changed.
- Changing the status through the task page or by dragging on the board are both recorded.
- Reordering a card inside the same column is not a tracked change and records nothing.
- Deleting a comment does not add an activity entry (comments are not task fields).
- When a task is deleted, all its comments and activity entries are removed together, and no
  orphan remains.
- Tasks that existed before this feature have no "created" entry in their history, because the
  history did not exist yet; their timeline starts with the first change recorded after the
  feature ships.
- A label that is later deleted from the system still reads correctly in old activity entries.
- Timestamps shown for comments and activity use the same format as the rest of the task page.

## Requirements *(mandatory)*

### Functional Requirements

**Comments**

- **FR-001**: Users MUST be able to add a comment to a task. The comment body is markdown text.
- **FR-002**: The system MUST reject a comment whose body is empty after trimming spaces, or longer
  than 10,000 characters, and show the user why.
- **FR-003**: Users MUST be able to edit the body of any existing comment. The same validation as
  FR-002 applies.
- **FR-004**: Users MUST be able to delete any existing comment, after confirming.
- **FR-005**: Each comment MUST show when it was written. A comment whose body was changed after
  it was written MUST show an "edited" marker.
- **FR-006**: Comment bodies MUST be displayed as rendered markdown, the same way task
  descriptions are.

**Activity**

- **FR-007**: The system MUST record an activity entry, without any user action, when a task is
  created.
- **FR-008**: The system MUST record one activity entry for each change to a task's title,
  description, status, priority, labels or due date, whatever part of the app made the change
  (task page, board drag and drop, or any other path).
- **FR-009**: Each activity entry MUST store which field changed, the old value, the new value and
  when it happened, so the entry can later be read as "changed priority from Medium to Urgent".
- **FR-010**: Status and priority MUST be shown with their display names (for example "In
  Progress", "Urgent"), labels by their names, and due dates in the same short date format used
  elsewhere; a missing due date MUST read as "no due date".
- **FR-011**: For labels, the entry MUST say which labels were added and which were removed.
- **FR-012**: For the description, the entry MUST read as one short line ("changed the
  description") and MUST let the user expand it on demand to see the full old and new text. The
  full text is collapsed by default so long descriptions do not flood the timeline.
- **FR-013**: The system MUST NOT record an entry when a save leaves a field's value unchanged, or
  when a card only changes position inside its column.
- **FR-014**: Activity entries MUST NOT be editable or deletable by the user.

**Timeline**

- **FR-015**: The task page MUST show one timeline under the description that merges comments and
  activity entries, ordered by time, oldest first and newest last.
- **FR-016**: The form to add a new comment MUST be at the end of the timeline.

**Counts**

- **FR-017**: The board card and the list row of every task with at least one comment MUST show the
  number of comments. Tasks with no comments MUST show no count.

**Deletion and data**

- **FR-018**: Deleting a task MUST delete all its comments and all its activity entries.
- **FR-019**: Upgrading an existing installation MUST keep all existing tasks, labels and label
  links unchanged.
- **FR-020**: There MUST be no author field, no user accounts and no permissions on comments or
  activity; the single user may edit or delete any comment.

### Key Entities *(include if feature involves data)*

- **Comment**: A note written by the user on one task. Has a markdown body, the time it was
  written, and the time it was last edited (empty if never edited). Belongs to exactly one task
  and is removed with it.
- **Activity entry**: A read-only record of one event on one task. Has the kind of event (task
  created, or which field changed), the old value, the new value and the time it happened.
  Belongs to exactly one task and is removed with it. Values are stored as they were at the time,
  so later renames or deletions of labels do not change old entries.
- **Task** (existing): gains a comment count shown on the board and in the list, and a timeline
  on its page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a comment to a task in under 10 seconds from opening the task page.
- **SC-002**: 100% of changes to the six tracked fields, made from any screen, appear in the
  task's timeline, and 0 entries appear for saves that change nothing.
- **SC-003**: Every activity entry can be read as a plain sentence naming the field, the old value
  and the new value, without looking anything up.
- **SC-004**: After deleting a task, 0 comments and 0 activity entries for it remain.
- **SC-005**: After upgrading, 100% of tasks, labels and label links that existed before are still
  there with the same values.
- **SC-006**: The comment count on the board and in the list always equals the number of comments
  on the task page.

## Assumptions

- There is one user. "Edit my own comment" means "edit any comment", since every comment is the
  user's own.
- Activity is recorded for changes made through the app. Changes made directly in the database
  file are out of scope.
- Reordering cards inside a column is not a change the user asked to track; moving a card to
  another column is a status change and is tracked.
- Tasks that exist before the upgrade do not get a back-filled "created" entry; inventing one
  would state a history that was never recorded.
- The demo data (seed) creates tasks through the normal create path, so each demo task starts with
  a "created" entry.
- Comments are plain markdown with the same rendering rules as the description (no mentions,
  attachments, reactions or threads).
- Times are shown in the same format and time zone as the "Created" and "Updated" times already on
  the task page.
- 10,000 characters is a comfortable upper limit for one comment; the description allows 20,000.
