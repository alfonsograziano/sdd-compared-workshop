# Spec Delta

## Purpose

Shows the whole story of a task in one place: a single timeline on the task detail page that mixes comments and activity entries in the order they happened.

## ADDED Requirements

### Requirement: One timeline under the description
The task detail page SHALL show one timeline below the task description that contains both the task's comments and its activity entries, ordered by time with the oldest first and the newest last. Entries with the same time MUST keep the order in which they were saved. A comment's place in the timeline is set by when it was written, not when it was last edited.

#### Scenario: Mixed entries
- **WHEN** a task was created, then commented on, then had its priority changed
- **THEN** the timeline shows the "created" entry, then the comment, then the priority change, in that order

#### Scenario: Editing does not move a comment
- **WHEN** the user edits an old comment
- **THEN** the comment stays at its original place in the timeline

### Requirement: Show activity entries as sentences
Each activity entry SHALL read as a short sentence that says what changed, from what to what, and when, using the same names the user sees elsewhere in the app (for example "In Progress" rather than an internal code). An empty value MUST be shown as "none". Because a description can be long, a description change MUST say that the description changed without printing the old and new text.

#### Scenario: Priority change sentence
- **WHEN** a task's priority changed from medium to urgent
- **THEN** the entry reads "changed priority from Medium to Urgent" and shows when it happened

#### Scenario: Status change sentence
- **WHEN** a task's status changed from todo to in_progress
- **THEN** the entry reads "changed status from Todo to In Progress"

#### Scenario: Description change sentence
- **WHEN** a task's description changed
- **THEN** the entry reads "changed the description" and does not print either version

#### Scenario: Created sentence
- **WHEN** the entry is the task's creation
- **THEN** it reads "created the task"

### Requirement: Show comments in the timeline
Each comment in the timeline SHALL show its rendered markdown body, when it was written, and the word "edited" when it has been edited. Each comment MUST offer actions to edit and to delete it.

#### Scenario: Edited comment
- **WHEN** a comment has been edited
- **THEN** the timeline shows it with its creation time and the word "edited"

#### Scenario: Unedited comment
- **WHEN** a comment has never been edited
- **THEN** the timeline does not show the word "edited" for it

### Requirement: Write a comment from the timeline
The task detail page SHALL show a comment box after the last timeline entry. Submitting it adds the comment to the end of the timeline and clears the box.

#### Scenario: Post a comment
- **WHEN** the user types a comment in the box and submits it
- **THEN** the comment appears as the last timeline entry and the box is empty again
