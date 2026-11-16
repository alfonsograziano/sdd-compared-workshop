- source_spec: `_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md`
  summary: The board ignores the result of moveTaskAction, so a failed move (for example a task deleted in another tab) shows no error and leaves the card where it was dropped.
  evidence: `src/components/Board.tsx` awaits `moveTaskAction` without reading `{ ok }`, on master too; this change only turned the old thrown error into `{ ok: false }`. Settle by dragging a card in one tab after deleting it in another.
