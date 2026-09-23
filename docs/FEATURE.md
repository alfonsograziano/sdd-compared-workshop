# Feature: comments and activity log on tasks

This is the feature that each branch builds with a different spec-driven framework. Every framework gets this same text as its input.

## The request

Add comments and an activity log to tasks.

When I open a task, I want to see one timeline under the description. The timeline mixes two kinds of entries, newest last:

- **Comments.** I can write a comment in markdown, edit my own comment, and delete it. Each comment shows when it was written and marks it as "edited" if it changed.
- **Activity.** Every change to a task is recorded on its own, without me doing anything: the task was created, and any change to its title, description, status, priority, labels or due date. Each entry says what changed, from what to what, and when. For example: "changed priority from Medium to Urgent".

On the board and in the list, each task shows how many comments it has, if it has any.

Deleting a task deletes its comments and its activity. There is only one user, so there is no author field and no permissions.
