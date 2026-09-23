# Branch `spec-kit`

This branch builds the feature in [FEATURE.md](FEATURE.md) (comments and an activity log on tasks) with GitHub Spec Kit. Everything under `.specify/`, `.claude/skills/` and `specs/` was made by following the Spec Kit commands step by step.

## Framework

| | |
|---|---|
| Framework | [GitHub Spec Kit](https://github.com/github/spec-kit) |
| Version | v1.0.10 |
| Agent | Claude Code (Spec Kit installs its commands as skills in `.claude/skills/speckit-*/SKILL.md`) |
| Script type | `sh` (bash scripts in `.specify/scripts/bash/`) |
| Date | 2026-09-23 |

Install command, run once at the repo root:

```bash
uvx --from git+https://github.com/github/spec-kit.git@v1.0.10 specify init --here --force --non-interactive --integration claude --script sh
```

The git extension was not turned on, so Spec Kit did not create branches or commits by itself. Every commit on this branch was made by hand after each step.

## The flow, as it happened

The git history shows one commit per Spec Kit step:

1. Install Spec Kit (pristine, nothing edited).
2. `/speckit-constitution`: project rules, written from the codebase.
3. `/speckit-specify`: the spec, from the "The request" section of FEATURE.md, word for word.
4. `/speckit-clarify`: five questions, answered and written into the spec.
5. `/speckit-plan`: plan, research, data model, contracts and quickstart.
6. `/speckit-tasks`: 32 tasks.
7. `/speckit-analyze`: one CRITICAL and one HIGH finding, both fixed.
8. `/speckit-implement`: five commits, one per phase or user story, then a polish commit.

## Read the artifacts in this order

1. [.specify/memory/constitution.md](../.specify/memory/constitution.md): the project rules every later step checks against.
2. [specs/001-task-comments-activity/spec.md](../specs/001-task-comments-activity/spec.md): what to build. The `## Clarifications` section near the top holds the clarify answers.
3. [specs/001-task-comments-activity/checklists/requirements.md](../specs/001-task-comments-activity/checklists/requirements.md): the spec quality check.
4. [specs/001-task-comments-activity/plan.md](../specs/001-task-comments-activity/plan.md): how to build it, and the Constitution Check table.
5. [specs/001-task-comments-activity/research.md](../specs/001-task-comments-activity/research.md): the design choices and the options that were turned down.
6. [specs/001-task-comments-activity/data-model.md](../specs/001-task-comments-activity/data-model.md): the two new tables.
7. [specs/001-task-comments-activity/contracts/](../specs/001-task-comments-activity/contracts/): the Server Actions and the UI names that tests use.
8. [specs/001-task-comments-activity/quickstart.md](../specs/001-task-comments-activity/quickstart.md): how to prove it works.
9. [specs/001-task-comments-activity/tasks.md](../specs/001-task-comments-activity/tasks.md): the task list, all ticked.
10. The code: `git diff master..spec-kit -- src tests drizzle`.

## What the framework installed vs. what it produced

| Installed by `specify init` (30 files) | Produced for this feature |
|---|---|
| `.claude/skills/speckit-constitution/SKILL.md` | `.specify/memory/constitution.md` (filled in, was a template) |
| `.claude/skills/speckit-specify/SKILL.md` | `specs/001-task-comments-activity/spec.md` |
| `.claude/skills/speckit-clarify/SKILL.md` | `## Clarifications` section inside `spec.md` |
| `.claude/skills/speckit-checklist/SKILL.md` (not used) | `specs/001-task-comments-activity/checklists/requirements.md` (made by specify) |
| `.claude/skills/speckit-plan/SKILL.md` | `plan.md`, `research.md`, `data-model.md`, `quickstart.md` |
| | `contracts/server-actions.md`, `contracts/ui.md` |
| `.claude/skills/speckit-tasks/SKILL.md` | `tasks.md` |
| `.claude/skills/speckit-analyze/SKILL.md` | no file (the command is read-only; its report is in the decision log below) |
| `.claude/skills/speckit-implement/SKILL.md` | the code, tests, migration, and ticks in `tasks.md` |
| `.claude/skills/speckit-converge/SKILL.md` (not used) | |
| `.claude/skills/speckit-taskstoissues/SKILL.md` (not used) | |
| `.specify/scripts/bash/` (6 scripts: `check-prerequisites.sh`, `common.sh`, `create-new-feature.sh`, `resolve-template.sh`, `setup-plan.sh`, `setup-tasks.sh`) | |
| `.specify/templates/` (5 templates: constitution, spec, plan, tasks, checklist) | |
| `.specify/memory/constitution.md` (template copy), `.specify/memory/.constitution-template.json` | |
| `.specify/workflows/speckit/workflow.yml`, `.specify/workflows/workflow-registry.json` | |
| `.specify/init-options.json`, `.specify/integration.json`, `.specify/integrations/*.manifest.json` (2), `.specify/.gitignore` | `.specify/feature.json` (points at the feature folder; ignored by git on purpose) |

Code produced by `/speckit-implement` (compared with `master`):

| Area | Files |
|---|---|
| Migration | `drizzle/0001_comments_and_activity.sql`, `drizzle/meta/0001_snapshot.json`, `drizzle/meta/_journal.json` |
| Data layer | new `src/lib/comments.ts`, `src/lib/activity.ts`, `src/lib/timeline.ts`; changed `src/lib/tasks.ts`, `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/validation.ts`, `src/lib/seed.ts` |
| Server Actions | `src/app/actions.ts` |
| UI | new `src/components/Timeline.tsx`, `src/components/CommentCount.tsx`; changed `TaskDetail.tsx`, `TaskCard.tsx`, `icons.tsx`, `src/app/list/page.tsx`, `src/app/tasks/[id]/page.tsx` |
| Tests | new `tests/unit/comments.test.ts`, `tests/unit/activity.test.ts`, `tests/unit/timeline.test.ts`, `tests/e2e/comments.spec.ts`; changed `tests/unit/format.test.ts` |
| Docs and config | `README.md`, `CLAUDE.md`, `.gitignore` |

## Decision log

Nobody was there to answer Spec Kit's questions, so I answered them as the product owner. I picked the simplest option that fits FEATURE.md each time.

### `/speckit-constitution`

| Question or prompt | Answer | Why |
|---|---|---|
| What goes in the five principle slots of the template? | Six principles instead of five: One Data Layer; Server Actions and Validated Input; Schema Changes Only Through Migrations; Tests Prove the Change (NON-NEGOTIABLE); Keep It Small; Accessible, Dense UI. | The skill allows more or fewer principles than the template. These six are the rules the codebase already follows (CLAUDE.md, README.md, the code). |
| Version and ratification date? | 1.0.0, ratified 2026-09-23. | First real version; there was no earlier one. |

### `/speckit-specify`

The skill allows up to 3 `[NEEDS CLARIFICATION]` markers. I used one.

| Question | Options | Answer | Why |
|---|---|---|---|
| Q1: How should a description change show in the timeline? (FR-012) | A) full old and new text inline; B) one short line, full text on demand; C) short line only | B | The request says each entry says "from what to what". Long descriptions would flood the timeline, so the text is folded and opens on click. |

### `/speckit-clarify`

The skill asks at most 5 questions, one at a time, each with a recommended answer. I took the recommended answer every time.

| # | Question | Answer | Why |
|---|---|---|---|
| 1 | When a task is created, one "created the task" entry, or one entry per starting value? | One "created the task" entry. | The request says "the task was created". Starting values are visible on the task itself. |
| 2 | Show every timeline entry at once, or load older ones in pages? | All at once. | One user and small tasks; paging adds work for nothing. |
| 3 | Exact times or relative times ("2 hours ago")? | Exact times, same format as "Created" and "Updated". | Same as the rest of the page, and no mismatch between server and browser rendering. |
| 4 | Where does the comment count go in a list row? | Next to the title, as an icon and a number. | The list has no free column; next to the title is where the eye already is. |
| 5 | Should the "edited" marker also say when it was edited? | Yes, on hover or focus. | Cheap to add, and "edited" alone hides useful information. |

### `/speckit-analyze`

The report had 8 findings. The skill then asks: "Would you like me to suggest concrete remediation edits for the top N issues?" I said yes for the CRITICAL and HIGH ones only.

| ID | Severity | Finding | What I did |
|---|---|---|---|
| D1 | CRITICAL | The comment count in the list view had no e2e test. The constitution says every changed user flow must have one. | Fixed: task T023 now checks the list view too. |
| F1 | HIGH | The UI contract disabled the "Comment" button while the box was empty, but the spec says an empty comment is rejected and the user sees why. With a disabled button that scenario cannot be tested. | Fixed: the button stays enabled and the error "Comment cannot be empty" shows under the form. Changed `contracts/ui.md` and T013. |
| C1 | MEDIUM | T013 did not say that errors are shown. | Fixed as part of F1. |
| F2 | MEDIUM | The timeline section is headed "Activity" but also holds comments. | Left as is. "Activity" is the usual name in Linear-style apps. |
| C2 | MEDIUM | No test that an old entry still reads well after its label is deleted. | Not changed in the artifacts, but I added that test during implement anyway (see below). |
| C3, A1, U1 | LOW | Read-only activity and no paging have no explicit task; due dates have no year; one rule is written twice in the spec. | Left as is. |

Metrics from the report: 21 functional requirements plus 4 success criteria that need code, 32 tasks, 100% coverage, 1 critical issue.

### `/speckit-implement`

| Prompt | Answer | Why |
|---|---|---|
| Checklist gate: "Some checklists have unchecked items. Proceed?" | Not asked. `requirements.md` was 16/16. | |
| Ignore-file check: add missing patterns to `.gitignore` | Added `/dist/` and `*.log`. | The skill says to add missing standard patterns for Node.js. |

### Other prompts

| Prompt | Answer |
|---|---|
| `specify init` warned that `.claude/` may hold credentials and suggested adding it to `.gitignore`. | Not done. `.claude/skills/` is the point of this branch, and there are no credentials in it. |
| The bundled `.specify/workflows/speckit/workflow.yml` has "review the spec" and "review the plan" gates (approve or reject). | I did not run the workflow engine; I ran each step on its own. I read each artifact before going to the next step, which is what the gates ask for. |

## Where I had to deviate, or things went wrong

- **No slash commands.** I could not type `/speckit-specify` and so on. For each step I read the `SKILL.md` file and followed it by hand, running the scripts it names. The output should be the same, but a live demo with real slash commands will look different: Claude will stop and wait for your answers.
- **`resolve-template.sh` prints content, not a path.** The specify skill says to copy the resolved template. Without `--json` the script prints the template text, so my first `cp` failed with "File name too long". I copied `.specify/templates/spec-template.md` directly. The content is the same.
- **The scripts call the feature folder a "branch".** `check-prerequisites.sh` and `setup-plan.sh` report `BRANCH: 001-task-comments-activity`, but the git branch is `spec-kit`. Without the git extension, Spec Kit reads the name from `.specify/feature.json`. I wrote the real git branch in the spec and plan headers.
- **The constitution's Sync Impact Report is not in the file.** The skill writes it as an HTML comment and says it is scratch material to remove before the commit. I removed it and put it in the commit message of the constitution commit.
- **Tests were added even though the template calls them optional.** The tasks template says tests are optional unless the spec asks. The constitution makes them required, so `tasks.md` has test tasks in every story.
- **"Write tests first and make sure they fail"**: I did write each story's tests first and ran them. They failed because the modules did not exist yet, not because an assertion failed.
- **Small extras beyond the task list.** Two helpers that no task names: `diffTask` in `src/lib/activity.ts` and `toTimelineEntries` in `src/lib/timeline.ts`. I also moved the `Conn` type from `tasks.ts` to `src/lib/db/index.ts` so the new modules could use it. I added two unit tests nobody asked for: an old label entry still reads well after the label is deleted, and `seed()` clears old comments.
- **Old tasks have no "created" entry.** This follows the spec. Tasks that existed before the migration start with an empty history, because making one up would be false.
- **Not used:** `/speckit-checklist`, `/speckit-converge` and `/speckit-taskstoissues`. They are optional. Note that Spec Kit 1.0.10 lists `converge` as step 6 of its main flow, after implement.

## Verification

All run on this branch on 2026-09-23:

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run test` | 57 tests in 5 files pass (22 before this feature) |
| `npm run build` | pass |
| `npm run test:e2e` | 4 tests pass: add, edit and delete a comment; priority change in the timeline; comment count on board and list; the old smoke test |
| Migration | A database seeded on `master` was migrated. Every task, label and label link was identical before and after, and the two new tables were empty. |
| Running app | `next start` on port 3051 against that migrated database: `/`, `/list` and `/tasks/1` answer 200, `/tasks/9999` answers 404. The server was stopped after. |

## Rough counts

| What | Count |
|---|---|
| `constitution.md` | 104 lines |
| `spec.md` | 263 lines (4 user stories, 21 functional requirements, 6 success criteria) |
| `plan.md` | 123 lines, plus `research.md` 96, `data-model.md` 90, contracts 84, `quickstart.md` 52 |
| `tasks.md` | 222 lines, 32 tasks (all done) |
| All Spec Kit artifacts for this feature | about 1,070 lines |
| Code changed | 16 files in `src/` (+598, -20), 5 files in `tests/` (+432), 3 migration files |
