# task-activity Specification

## Purpose
Keeps an automatic history of every change made to a task, so the user can see what changed, from what to what, and when, without writing anything down.

## Requirements

### Requirement: Record task creation
The system SHALL record one "created" activity entry when a task is created, with the task's creation time.

#### Scenario: New task
- **WHEN** the user creates a task
- **THEN** the task's activity contains exactly one entry, saying the task was created

### Requirement: Record changes to tracked fields
The system SHALL record one activity entry for each tracked field whose value changes: title, description, status, priority, labels and due date. Each entry MUST store which field changed, the old value, the new value and the time of the change. Entries MUST be recorded no matter how the change was made (the task detail page, dragging a card to another column on the board, or any other path that changes the task).

#### Scenario: Change priority
- **WHEN** the user changes a task's priority from Medium to Urgent
- **THEN** a new activity entry records the priority changing from Medium to Urgent

#### Scenario: Change several fields at once
- **WHEN** a single update changes both the title and the due date
- **THEN** two activity entries are recorded, one for the title and one for the due date

#### Scenario: Move a card to another column
- **WHEN** the user drags a card from Todo to In Progress on the board
- **THEN** a new activity entry records the status changing from Todo to In Progress

#### Scenario: Change labels
- **WHEN** the user adds the label Docs to a task that has the label Bug
- **THEN** a new activity entry records the labels changing from "Bug" to "Bug, Docs"

#### Scenario: Set and clear a due date
- **WHEN** the user sets a due date on a task that had none, and later clears it
- **THEN** one entry records the due date changing from none to the date, and a second entry records it changing from the date to none

### Requirement: Do not record non-changes
The system SHALL NOT record an activity entry for a field whose new value equals its old value, and SHALL NOT record reordering a card inside the same column.

#### Scenario: Same value saved again
- **WHEN** an update sets a task's priority to the priority it already has
- **THEN** no activity entry is recorded

#### Scenario: Reorder inside a column
- **WHEN** the user drags a card to a new spot in the same column
- **THEN** no activity entry is recorded

#### Scenario: Comments are not activity
- **WHEN** the user adds, edits or deletes a comment
- **THEN** no activity entry is recorded

### Requirement: Keep history readable after labels change
The system SHALL store label changes by label name at the time of the change, so an old entry still reads correctly if a label is later renamed or deleted.

#### Scenario: Label deleted later
- **WHEN** a label that appears in an old activity entry is deleted
- **THEN** the old entry still shows the label's name

### Requirement: Delete activity with its task
The system SHALL delete every activity entry of a task when the task is deleted.

#### Scenario: Delete a task with activity
- **WHEN** the user deletes a task
- **THEN** none of that task's activity entries remain in the system

### Requirement: Keep existing data on upgrade
The system SHALL keep every existing task, label and label link unchanged when the database is upgraded to support comments and activity. Tasks that existed before the upgrade start with no comments and no activity entries.

#### Scenario: Upgrade a database with data
- **WHEN** a database that already holds tasks and labels is upgraded
- **THEN** every task, label and label link has the same values as before, and each task's timeline is empty
