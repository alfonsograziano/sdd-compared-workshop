# Verification Report: add-task-comments-and-activity

Output of `/opsx:verify` (OpenSpec 1.13.1, run 2026-11-16, before archive). OpenSpec prints this report in the chat and writes no file; it was saved here by hand so it stays with the change. The "Action" column was added afterwards.

## Summary

| Dimension    | Status |
|--------------|--------|
| Completeness | 20/20 tasks, 16 requirements, all implemented |
| Correctness  | 16/16 requirements covered; 28/31 scenarios fully asserted by tests |
| Coherence    | Design decisions D1–D9 followed, 2 minor issues |

Evidence: `openspec status` reports `all_done`; lint, typecheck and 50 unit tests pass; `0000_init.sql` is unchanged and `0001` only creates tables and indexes; every write to `tasks` goes through `src/lib/tasks.ts`, so no path skips activity.

## Issues

| Level | Issue | Action |
|---|---|---|
| CRITICAL | None | |
| WARNING | Scenario "Upgrade a database with data" has no automated test; task 1.3 was a manual check | Task 7.1 |
| WARNING | `task-timeline` says same-time entries keep save order, but `getTimeline` puts activity first (design D6) | Spec reworded to match D6 |
| WARNING | "Reject an empty comment": the Comment button is disabled when the box is blank, so the user never sees the error the spec promises | Task 7.2 |
| SUGGESTION | "Markdown formatting" test checks bold but not a list | Task 7.4 |
| SUGGESTION | "Reject an empty edit": the error the user sees is not asserted | Task 7.3 |
| SUGGESTION | `deleteCommentAction` returns `{ ok: true }` for a missing comment | Task 7.5 |
| SUGGESTION | `withLabels` also attaches comment counts; the name misleads | Task 7.6 |
| SUGGESTION | e2e was not run during verify | Task 7.7 |

## Final assessment

No critical issues. 3 warnings to consider. Ready for archive (with noted improvements).
