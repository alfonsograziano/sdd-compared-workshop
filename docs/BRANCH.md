# Branch `bmad`: BMAD Method

This branch builds the feature in [FEATURE.md](FEATURE.md) with BMAD Method. It uses only the `bmad-build` skill, which is BMAD's one-session "Build" path. It does not use the full planning track (product brief, PRD, architecture, epics and stories).

## Framework and install

- **Framework:** BMAD Method, version **6.12.0** (modules `core` and `bmm`, 29 skills for Claude Code).
- **Date:** 2026-09-23.
- **Install command:**

```bash
npx -y bmad-method@6.12.0 install --directory . --modules bmm --tools claude-code --yes --user-name Alfonso
```

The installer needs `uv` (Python), because each skill starts by running `uv run _bmad/scripts/render_skill.py`. That script writes a rendered copy of the workflow into `_bmad/render/`, which is gitignored.

The input to `bmad-build` was the "The request" section of FEATURE.md, word for word.

## Read the artifacts in this order

1. [`_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md`](../_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md) is the only planning artifact. Read it top to bottom. The part inside `<frozen-after-approval>` is the intent the human approved: Intent, Boundaries, the I/O and edge-case matrix, and Decisions. Below it are the parts the agent owns: Code Map, Tasks & Acceptance, Implementation Notes, Review Triage Log and Design Notes.
2. [`_bmad-output/implementation-artifacts/deferred-work.md`](../_bmad-output/implementation-artifacts/deferred-work.md) holds the one review finding that was put off for later.
3. The code, in the feature commit: `git show beb64df --stat`. Start with `drizzle/0001_comments_and_activity.sql`, then `src/lib/db/schema.ts`, `src/lib/tasks.ts`, `src/lib/format.ts`, `src/app/actions.ts`, `src/components/Timeline.tsx`.
4. The tests: `tests/unit/tasks.test.ts`, `tests/unit/format.test.ts`, `tests/unit/migration.test.ts`, `tests/e2e/comments.spec.ts`.

## What BMAD installed vs. what it produced

| Kind | Path | What it is |
|---|---|---|
| Installed | `_bmad/` | Config (`config.toml`, `core/`, `bmm/`), manifests (`_config/`), the Python scripts that render skills (`scripts/`), and the empty `custom/` and `render/` folders |
| Installed | `.claude/skills/bmad-*` (29 folders) | The skills: agents (analyst, pm, architect, dev, ux), planning (prd, architecture, epics, sprint planning), and the build path (`bmad-build`, `bmad-build-auto`, `bmad-code-review`, `bmad-review`, ...) |
| Installed | `_bmad-output/` | Empty output folder, created by the installer |
| Produced | `_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md` | The spec: intent, decisions, code map, tasks, acceptance criteria, review triage log |
| Produced | `_bmad-output/implementation-artifacts/deferred-work.md` | One deferred review finding |
| Produced | `drizzle/0001_comments_and_activity.sql` and `drizzle/meta/*` | New migration: two tables and a backfill of "created" entries |
| Produced | `src/**` (13 files) | Data layer, actions, timeline UI, comment count |
| Produced | `tests/**` (4 files) | Unit tests, a migration test, and an e2e test |

## How the run went

`bmad-build` is five steps, each in its own file. The agent reads one step at a time.

1. **Clarify and route.** Reads state, checks git is clean, checks the request is a single goal, picks the spec file name.
2. **Plan.** A subagent investigates the code. The agent writes the spec, lists open questions, checks the size (900 to 1600 tokens is the target), then stops at CHECKPOINT 1 for approval.
3. **Implement.** A fresh subagent gets one short prompt: read the spec and build it. The spec is its only source. The main agent then checks the diff against every task and every matrix row.
4. **Review.** Three reviewer subagents run in parallel on the diff: Blind Hunter (sees only the diff), Edge Case Hunter (diff, then the spec), Verification Gap (looks for untested changes). The main agent judges each finding, logs it, and sends the small fixes back to the same implementation subagent.
5. **Present.** Marks the spec `done` and makes one local commit.

The whole run, from the first render to the commit, took about 13 minutes. The implementation subagent took about 6.5 minutes. The review round took about 2 minutes.

## Decision log

Nobody was at the keyboard, so I acted as the product owner who wrote FEATURE.md and answered every stop myself.

| # | Where | Question or checkpoint | Answer | Why |
|---|---|---|---|---|
| 1 | Workflow start | May the workflow use subagents? (it asks once for the whole run) | Yes | The workflow is built around subagents for the investigation, the implementation and the review. Without them it falls back to doing it all in one context. |
| 2 | Step 1, multi-goal check | Comments and the activity log could each ship on their own. Split them, or keep both? | Keep all goals | The request asks for one timeline that mixes both. Shipping one half would not match the request, and the other branches build both. |
| 3 | Step 2, open question 1 | How should a description change read? A) one short line, "changed the description", or B) the old and new text in full | A | Descriptions are long markdown. Full text would flood the timeline. The old and new text are still stored in the database. |
| 4 | Step 2, open question 2 | Existing tasks have no "created" entry. A) backfill one per task, dated at its `created_at`, or B) no backfill | A | Every task then has a complete timeline, and the backfill is one safe `INSERT ... SELECT`. |
| 5 | Step 2, token gate | The spec is about 1,850 tokens, above the 1,600 target. Split, or keep the full spec? | Keep full spec | It is one feature across DB, data layer and UI. Splitting would ship half a timeline. |
| 6 | Step 2, CHECKPOINT 1 | Approve and continue / Approve and stop / Review spec | Approve and continue | The spec covered every point of the request, named every file, and had a clear edge-case matrix (no-op saves, drag inside a column, cascade delete). |
| 7 | Step 4, triage | 17 findings from the three reviewers | 3 patched, 1 deferred, 13 rejected with a reason | Patched: typed text lost when a comment save fails (React resets the form), "Edit"/"Delete" buttons with no clear name for screen readers, and tests that did not check the `NotFoundError` class. Deferred: no test pins the tie order between a comment and an activity in the same millisecond. Every row and its reason is in the spec's Review Triage Log. |

There was no intent gap and no bad-spec finding, so the review did not loop back. `review_loop_iteration` stayed at 0.

## Honest notes and deviations

- **Checkpoints in practice.** The skill has one formal checkpoint (CHECKPOINT 1, after the spec). The real stops were five: the subagent question, the multi-goal check, the open questions, the token gate and CHECKPOINT 1. After approval it ran to the commit with no more stops.
- **The spec grew.** The spec was about 1,850 tokens at approval. After the agent added Implementation Notes and the Review Triage Log it is 130 lines and about 3,000 tokens. The frozen part did not change.
- **One line added to the implementation prompt.** Step 3 says to send the implementation subagent its prompt word for word. I added one line about process safety on this machine (never kill processes by name, do not commit). It says nothing about the feature.
- **Staging.** Step 3 says to "stage the diff". I used `git add -A` to include new files in the diff. Step 4 then says not to `git add` anything, so it was already staged by then. This did not change what was reviewed.
- **Commit message.** Step 5 asks for a conventional commit message from the spec title: `feat: comments and activity log on tasks`. The co-author trailer was added in the same commit, so no amend was needed.
- **Hand-edited migration.** The implementation subagent generated `0001` with `npm run db:generate` and then added the backfill `INSERT` at the end by hand. This is a new migration, not an old one, so it follows the project rule.
- **Things the agent did beyond the spec**, recorded in its Implementation Notes: a save that changes nothing no longer bumps `updatedAt`, and a missing id now returns `{ ok: false }` from the actions instead of throwing.
- **Tests.** bmad-build's own run produced every test the workshop asks for: comments CRUD, activity for every field, cascade delete, migration safety, and the e2e flows. I did not add any.
- **Migration check.** I seeded a database with `master`'s code, ran this branch's migrations on it, and compared `tasks`, `labels` and `task_labels` row by row. They were identical, and all 12 tasks got one "created" entry at their own `created_at`.
- **`package-lock.json`.** `npm install` rewrote some version ranges in the lock file. No dependency was added, so I did not commit that change.

## Rough counts

- **Spec:** 130 lines. 9 tasks, 3 acceptance criteria, and a 10-row I/O and edge-case matrix. 3 recorded decisions.
- **Review:** 17 findings, 3 patched, 1 deferred.
- **Code:** 13 files changed under `src/` (one new: `Timeline.tsx`), plus 1 migration and 4 test files. About 1,220 lines added across `src`, `tests` and `drizzle`, most of it tests and the drizzle snapshot.
- **Tests:** 45 unit tests and 2 e2e tests, all passing.
