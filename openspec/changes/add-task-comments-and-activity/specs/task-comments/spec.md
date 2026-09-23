# Spec Delta

## Purpose

Lets the single user of the app leave markdown notes on a task, fix or remove them later, and see at a glance on the board and in the list which tasks have comments.

## ADDED Requirements

### Requirement: Add a comment to a task
The system SHALL let the user add a comment to an existing task. A comment has a markdown body and the time it was written. The body MUST NOT be empty after trimming whitespace and MUST NOT be longer than 20,000 characters. A comment has no author field.

#### Scenario: Add a valid comment
- **WHEN** the user submits the comment "Looks good, **ship it**" on task 1
- **THEN** the task has one more comment with that body and the current time as its creation time

#### Scenario: Reject an empty comment
- **WHEN** the user submits a comment whose body is empty or only whitespace
- **THEN** no comment is saved and the user sees an error

#### Scenario: Reject a comment on a missing task
- **WHEN** a comment is submitted for a task id that does not exist
- **THEN** no comment is saved and the request fails

### Requirement: Edit a comment
The system SHALL let the user change the body of an existing comment. The same body rules as for a new comment apply. When the body actually changes, the comment MUST be marked as edited and keep its original creation time.

#### Scenario: Edit a comment
- **WHEN** the user changes a comment's body from "typo heer" to "typo here"
- **THEN** the comment shows "typo here", keeps its original creation time, and is marked as edited

#### Scenario: Save without changes
- **WHEN** the user saves a comment with the same body it already has
- **THEN** the comment is not marked as edited

#### Scenario: Reject an empty edit
- **WHEN** the user clears a comment's body and saves
- **THEN** the comment keeps its previous body and the user sees an error

### Requirement: Delete a comment
The system SHALL let the user delete a comment. A deleted comment MUST disappear from the task and from the task's comment count.

#### Scenario: Delete a comment
- **WHEN** the user deletes one of the two comments on a task
- **THEN** only the other comment remains and the task's comment count is 1

### Requirement: Render comments as markdown
The system SHALL render a comment body as markdown (GitHub-flavored), the same way task descriptions are rendered.

#### Scenario: Markdown formatting
- **WHEN** a comment body contains `**bold**` and a list
- **THEN** the timeline shows bold text and a list, not the raw markdown characters

### Requirement: Show the comment count on the board and in the list
The system SHALL show the number of comments on each task card on the board and on each row of the list view, only when the task has at least one comment.

#### Scenario: Task with comments
- **WHEN** a task has 3 comments
- **THEN** its board card and its list row both show the count 3

#### Scenario: Task without comments
- **WHEN** a task has no comments
- **THEN** its board card and its list row show no comment count

### Requirement: Delete comments with their task
The system SHALL delete every comment of a task when the task is deleted.

#### Scenario: Delete a task with comments
- **WHEN** the user deletes a task that has comments
- **THEN** none of that task's comments remain in the system
