# Activity entries

How each recorded change reads in the timeline (CAP-4). Values in quotes are display labels, not stored keys.

| Change | Recorded when | Reads as |
|---|---|---|
| Created | The task is created; also backfilled once for every task that existed before the migration, dated at its creation time | "created the task" |
| Title | The trimmed title differs from the current one | "changed the title from *old* to *new*" |
| Description | The text differs from the current one | "changed the description" (one short line; old and new text are still stored) |
| Status | The status differs, from the detail form or a board drag to another column | "changed status from Todo to In Progress" |
| Priority | The priority differs | "changed priority from Medium to Urgent" |
| Labels | The set of labels differs; one entry per save | "changed labels from Bug to Bug, Docs" (label names, sorted) |
| Due date | The date differs | "changed due date from none to Sep 24" |

## Rules

- A save that leaves a field equal to its current value records nothing for that field.
- A save that changes several fields records one entry per changed field.
- Reordering a card inside the same column is not a change.
- Empty values read as "none": no due date, no labels.
- Labels are stored by name, not id, so an old entry still reads correctly after a label is renamed or deleted.
- A comment is "edited" only when a save changes its body. A save with the same body after trimming does not mark it.
