# The `openspec` branch

This branch builds the feature in [FEATURE.md](FEATURE.md) (comments and an activity log on tasks) with OpenSpec. It starts from `master` and uses nothing from the other workshop branches.

## Framework

| | |
|---|---|
| Framework | OpenSpec by Fission AI |
| Version | 1.13.1 (`@fission-ai/openspec@1.13.1`) |
| Install command | `npx -y @fission-ai/openspec@1.13.1 init --tools claude --no-animation --force` |
| Schema | `spec-driven` (the default) |
| Profile | `core` (the default: propose, explore, apply, archive, sync, update) |
| Date | 2026-09-23 |
| Agent | Claude Code, following the installed command and skill files by hand |

Every CLI call on this branch used `npx -y @fission-ai/openspec@1.13.1 ...`, so a different global install never got involved.

## How to read this branch

OpenSpec is organized around a change to an existing system. The flow is propose, apply, archive, and then you read the spec the change left behind. Read the files in this order:

1. [openspec/config.yaml](../openspec/config.yaml) — the project context that OpenSpec feeds into every step.
2. [proposal.md](../openspec/changes/archive/2026-09-23-add-task-comments-and-activity/proposal.md) — why, what changes, and which capabilities the change adds.
3. The three delta specs, which say what the system must do, with scenarios:
   - [specs/task-comments/spec.md](../openspec/changes/archive/2026-09-23-add-task-comments-and-activity/specs/task-comments/spec.md)
   - [specs/task-activity/spec.md](../openspec/changes/archive/2026-09-23-add-task-comments-and-activity/specs/task-activity/spec.md)
   - [specs/task-timeline/spec.md](../openspec/changes/archive/2026-09-23-add-task-comments-and-activity/specs/task-timeline/spec.md)
4. [design.md](../openspec/changes/archive/2026-09-23-add-task-comments-and-activity/design.md) — how it is built, with the options that were turned down.
5. [tasks.md](../openspec/changes/archive/2026-09-23-add-task-comments-and-activity/tasks.md) — the checklist that the apply step worked through. Every box is ticked.
6. The code, one commit per group of tasks: `git log --oneline master..openspec`.
7. The specs the change left behind, which are now the living description of the system: [openspec/specs/task-comments/spec.md](../openspec/specs/task-comments/spec.md), [openspec/specs/task-activity/spec.md](../openspec/specs/task-activity/spec.md) and [openspec/specs/task-timeline/spec.md](../openspec/specs/task-timeline/spec.md).

A good trick for the workshop is to compare step 3 with step 7. The delta says `## ADDED Requirements`. The main spec says `## Requirements`. That merge is what archive does.

## What OpenSpec installed and what it produced

| Kind | Path | Made by |
|---|---|---|
| Installed | `.claude/commands/opsx/propose.md`, `apply.md`, `archive.md`, `explore.md`, `sync.md`, `update.md` | `openspec init` |
| Installed | `.claude/skills/openspec-propose/`, `openspec-apply-change/`, `openspec-archive-change/`, `openspec-explore/`, `openspec-sync-specs/`, `openspec-update-change/` (one `SKILL.md` each) | `openspec init` |
| Installed | `openspec/config.yaml`, `openspec/specs/.gitkeep`, `openspec/changes/archive/.gitkeep` | `openspec init` |
| Filled in | `openspec/config.yaml` (the `context:` block) | the agent, from the real codebase |
| Produced | `openspec/changes/archive/2026-09-23-add-task-comments-and-activity/.openspec.yaml` | `openspec new change` |
| Produced | `proposal.md`, `design.md`, `tasks.md` and `specs/<capability>/spec.md` × 3 in that folder | the agent, from `openspec instructions <artifact>` templates |
| Produced | `openspec/specs/task-comments/spec.md`, `task-activity/spec.md`, `task-timeline/spec.md` | the archive step (sync) |
| Code | `src/`, `drizzle/`, `tests/` | the agent, during apply |

## Decision log

OpenSpec did not stop to ask many questions. The skills tell the agent to ask only when an unclear point would change scope, visible behavior or the acceptance criteria, and to write the smaller choices into the artifacts. Nobody could answer questions during this run, so every choice below was made by the agent. Each one is also written down in the proposal, specs or design.

| # | Where it came up | Question or choice | Answer | Why |
|---|---|---|---|---|
| 1 | propose, step 1 | Change name | `add-task-comments-and-activity` | The skill says to derive a kebab-case name from the request. |
| 2 | propose, step 3 | Which workflow schema? | `spec-driven`, the default | The skill says to use the default unless the user asks for another. |
| 3 | proposal | New or modified capabilities? | Three new ones: `task-comments`, `task-activity`, `task-timeline`. No modified ones. | `openspec list --specs` found no specs on `master`, so there was nothing to modify. Three capabilities keep each spec about one thing. |
| 4 | proposal | `skip_specs`? | No | The change adds behavior, so it needs specs. |
| 5 | design | Write `design.md`? It is optional. | Yes | The instructions say to write it for data model changes and migrations, and this change has both. |
| 6 | spec, activity | Does a board drag to another column count as a status change? | Yes. Reordering inside the same column does not. | The request says "any change to its status". A reorder changes no tracked field. |
| 7 | spec, activity | Are same-value saves recorded? | No | An entry that says "from Low to Low" is noise. |
| 8 | spec, activity | Do comments create activity entries? | No | The request lists only task fields. |
| 9 | spec, activity | How are label changes stored? | One entry per update, with the sorted label names before and after, for example "from Bug to Bug, Docs" | The request asks for "from what to what". Names, not ids, keep old entries readable after a label is renamed or deleted. |
| 10 | spec, activity | Backfill a "created" entry for tasks that exist before the migration? | No. Old tasks start with an empty timeline. | It keeps the migration pure (only new tables) and keeps old rows untouched. |
| 11 | spec, timeline | How does a description change read? | "changed the description", without the text | A description can be 20,000 characters. The old and new text are still stored. |
| 12 | spec, timeline | Where does an edited comment sit in the timeline? | Where it was written, not where it was edited | Moving a comment on every edit would make the timeline hard to follow. |
| 13 | spec, timeline | How is an empty value shown? | "none", for example "changed due date from none to Sep 24" | Short and clear. |
| 14 | spec, comments | When is a comment "edited"? | Only when the body really changes. Stored as a nullable `edited_at` column. | A save with no change should not add the marker. |
| 15 | spec, comments | Comment length limits | 1 to 20,000 characters after trimming | Same limit as the description. |
| 16 | design | One timeline table or two? | Two tables, `comments` and `task_activity`, merged in the data layer | Comments can be edited and deleted, activity is append-only. |
| 17 | design | Record activity with SQLite triggers or in TypeScript? | In `src/lib/tasks.ts`, inside the same transaction as the change | The project keeps all data logic there, and triggers cannot read label names easily. |
| 18 | design | Store display text or raw values? | Raw values (`in_progress`, `2026-09-24`). The sentence is built when the page renders. | Wording can change later without a data migration, and each field can be unit tested. |
| 19 | design | Where does the new code live? | In the existing files (`tasks.ts`, `validation.ts`, `actions.ts`, `format.ts`) plus one new `Timeline.tsx` | CLAUDE.md says `tasks.ts` is the only module that touches the database. |
| 20 | design | Confirm before deleting a comment? | Yes, with `confirm()` | That is how deleting a task works today. |
| 21 | apply | Add demo comments to the seed? | No | Not in the request, and it would change what the existing tests see. |
| 22 | archive, step 4 | "Sync now (recommended)" or "Archive without syncing"? | Sync now | Without the sync, `openspec/specs/` stays empty and there is no living spec to read. |

## What went wrong, and where this run differs from a normal one

- **The archive skill does not call `openspec archive`.** The workshop brief expected `openspec archive <name> -y`. In 1.13.1 the installed archive skill does the work itself: the agent merges each delta spec into `openspec/specs/` (the "sync specs" workflow), runs `openspec validate --specs`, and then moves the folder with `mkdir` and `mv`. This run followed the skill. To check the result, the CLI command `openspec archive add-task-comments-and-activity -y` was also run on a throwaway copy of the `openspec/` folder. Its output matched the agent's merge line for line, after one fix: the first agent merge had an extra blank line after `## Purpose`, and it was removed to match the CLI.
- **The propose step says "stop here".** The propose skill says planning only, and to wait for a new user request before apply. Here the brief was the user request for the whole flow, so apply started right after the proposal was committed.
- **Slash commands could not be run.** The agent read each command file and the skill it points to, and followed the steps by hand, running the same CLI calls.
- **A stale test database from another branch broke the first e2e run.** `data/` is ignored by git, so it is shared by every branch in the same checkout. `data/e2e.db` still held a migration from another branch, and drizzle tried to create `comments` a second time. Moving the file aside fixed it. Nothing on this branch was changed for it.
- **`npm install` rewrites `package-lock.json` on `master`.** The lock file on `master` still has `^` ranges that `package.json` no longer has. The change was not committed, because it is not part of this feature.
- **The skills call a bare `openspec`.** The installed files allow `Bash(openspec:*)` and write every command as `openspec ...`. On a machine with an older global install, a real `/opsx:propose` would run that older version, which may not know newer commands like `openspec context` or `openspec instructions archive`. This run used `npx -y @fission-ai/openspec@1.13.1` for every call to avoid that. For a live demo, install the same version globally or put it on the PATH first.
- **Validation passed on the first try.** `openspec validate add-task-comments-and-activity --strict --no-interactive` was clean the first time, and `openspec validate --all --strict` was clean after archive.
- **A visual check was added.** Besides the tests, the task page, board and list were opened in a browser on a dev server, on a copy of a database seeded on `master`.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run test` (50 unit tests, 28 of them new), `npm run build` and `npm run test:e2e` (2 specs: the old smoke test and the new comments test) all pass.
- The migration `drizzle/0001_comments_and_activity.sql` only creates two tables and two indexes. A database seeded on `master` was migrated, and every row in `tasks`, `labels` and `task_labels` was the same before and after.
- The built app ran on port 3052, and `/`, `/list` and `/tasks/1` returned 200.

## Rough counts

| What | Count |
|---|---|
| `proposal.md` | 36 lines |
| `design.md` | 75 lines, 9 decisions |
| Delta specs | 197 lines in 3 files, 16 requirements, 32 scenarios |
| Main specs after archive | 194 lines in 3 files |
| `tasks.md` | 39 lines, 20 tasks in 6 groups |
| Code files changed | 18 (15 app and migration files, 3 test files), about 1,170 lines added |
| OpenSpec files installed | 15 (6 commands, 6 skills, 3 in `openspec/`) |
