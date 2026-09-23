# Quickstart: validate Task Comments and Activity Log

How to prove the feature works. Details of the data live in [data-model.md](./data-model.md);
names of UI elements in [contracts/ui.md](./contracts/ui.md).

## Prerequisites

- Node.js 24 (`.nvmrc`), then `npm install`.

## 1. Existing data survives the migration

```bash
git stash -u   # or check out master
npm run db:migrate && npm run db:seed        # old schema, 12 tasks
git stash pop  # back to this branch
npm run db:migrate                           # applies 0001_comments_and_activity
sqlite3 data/app.db "select count(*) from tasks; select count(*) from comments; select count(*) from task_activity;"
```

Expected: 12 tasks, 0 comments, 0 activity rows. Old tasks show an empty timeline apart from new
changes.

## 2. Automated checks

```bash
npm run lint
npm run typecheck
npm run test        # unit: tests/unit/comments.test.ts, activity.test.ts, timeline.test.ts
npm run build
npm run test:e2e    # e2e: tests/e2e/comments.spec.ts plus the existing smoke test
```

All must pass (constitution IV).

## 3. Manual walk-through

```bash
npm run db:seed && npm run dev
```

1. Open a task. The timeline under the description starts with "created the task".
2. Change the priority from the sidebar. A new line reads "changed priority from X to Y".
3. Write `Needs **review**` in the "New comment" box and press "Comment". It appears with bold
   text and a time.
4. Press "Edit comment", change the text, press "Save". The comment shows "edited"; hover it to
   see the edit time.
5. Go back to the board. The card shows a comment icon with 1. The list view shows it next to the
   title.
6. Drag the card to another column, open it again: "changed status from A to B".
7. Delete the comment. The count disappears from the board.
8. Delete the task. Its comments and activity rows are gone
   (`select count(*) from comments where task_id = <id>` returns 0).
