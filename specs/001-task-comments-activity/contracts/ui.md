# Contract: UI

What the browser shows and how tests and assistive tech find it. Names below are the accessible
names that the e2e test uses.

## Task page (`/tasks/:id`) — timeline

- Placed in the main column, under the description, headed "Activity" (`h2`).
- An ordered list with `aria-label="Timeline"`; each entry is an `li` with
  `data-testid="timeline-comment"` or `data-testid="timeline-activity"`.
- Activity entry: one line of muted text, for example "changed priority from Medium to Urgent",
  followed by the time from `formatDateTime`. A description change renders as a native
  `<details>` whose summary is "changed the description" and whose body shows "Before" and
  "After" blocks.
- Comment entry: a panel with the time it was written, an "edited" marker when edited (a focusable
  element whose `title` and `aria-label` are "Edited <time>"), the rendered markdown body, and two
  buttons: "Edit comment" and "Delete comment".
- Editing: the body turns into a textarea (`aria-label="Edit comment"`) with "Save" and "Cancel".
- Deleting asks `confirm("Delete this comment?")`.
- New comment form at the end: textarea `aria-label="New comment"`, placeholder
  "Leave a comment… (markdown)", button "Comment". The button is disabled while the text is
  empty. Errors from the action show under the form in red text.

## Board card and list row — comment count

- Component `CommentCount` renders nothing for 0; otherwise a comment icon and the number, with
  `aria-label="<n> comment(s)"` and `data-testid="comment-count"`.
- Board: at the right end of the card's bottom row.
- List: right after the task title link (clarification Q4).
