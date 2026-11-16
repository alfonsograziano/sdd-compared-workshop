# Branch `bmad`: BMAD Method

This branch builds the feature in [FEATURE.md](FEATURE.md) with BMAD Method. It starts from `master` and uses nothing from the other workshop branches.

It uses BMAD's spec-first path:

1. `bmad-spec` turns the request into a standalone spec.
2. `bmad-build` plans, implements and reviews from that spec.
3. A separate `bmad-review` adversarial pass runs on the finished code.

Each phase is its own commit. The branch does not use the full planning track (product brief, PRD, architecture, epics and stories). That track exists for products, and this feature is one change to a small app.

## Framework and install

- **Framework:** BMAD Method, version **6.12.0**, modules `core` and `bmm`, 29 skills for Claude Code.
- **Install date:** 2026-09-23. The run itself is from 2026-11-16.
- **Install command:**

```bash
npx -y bmad-method@6.12.0 install --directory . --modules bmm --tools claude-code --yes --user-name Alfonso
```

The installer needs `uv` (Python), because each skill starts by running a script in `_bmad/scripts/`. `bmad-build` renders its workflow into `_bmad/render/`, which is gitignored.

## The commits, one per phase

`git log --oneline master..bmad`:

| Commit | Phase | What it adds |
|---|---|---|
| `Install BMAD Method 6.12.0 for Claude Code` | Install | `_bmad/` and the 29 `.claude/skills/bmad-*` skills |
| `spec: distill FEATURE.md into SPEC.md (bmad-spec)` | Spec | The standalone spec folder |
| `plan: implementation spec approved at checkpoint 1 (bmad-build steps 1-2)` | Plan | `bmad-build`'s implementation spec, status `ready-for-dev` |
| `feat: comments and activity log on tasks (bmad-build step 3)` | Code | Migration, data layer, UI and tests, written by a fresh subagent from the spec alone |
| `fix: apply bmad-build review patches (bmad-build steps 4-5)` | Built-in review | Patches from three parallel reviewers, the triage log, `deferred-work.md`, spec status `done` |
| `review: adversarial pass on the feature diff (bmad-review)` | Adversarial review | The report, with the triage of every finding |
| `fix: address the adversarial review (bmad-review)` | Fixes | The six adversarial findings that held up |
| `docs: add the BMAD branch notes` | Notes | This file and the README pointer |
| `docs: describe the new data-layer modules in CLAUDE.md` | Notes | The Architecture section names the new modules, activity recording and `NotFoundError` |

## Read the artifacts in this order

1. **The spec:** [`_bmad-output/specs/spec-task-comments-and-activity-log/`](../_bmad-output/specs/spec-task-comments-and-activity-log/)
   - [`SPEC.md`](../_bmad-output/specs/spec-task-comments-and-activity-log/SPEC.md) is the contract. It has five fields: Why, Capabilities (CAP-1 to CAP-7, each with an intent and a testable success line), Constraints, Non-goals and Success signal.
   - [`activity-entries.md`](../_bmad-output/specs/spec-task-comments-and-activity-log/activity-entries.md) is its one companion: how each recorded change reads.
   - `.memlog.md` is a hidden file in the same folder. It is the append-only log the spec is derived from: every capability, every open question, the answer to each one, and the two validation passes. `bmad-spec` treats it as the source of truth and SPEC.md as a render of it.
2. **The implementation spec:** [`_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md`](../_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md). This is what `bmad-build` writes from SPEC.md and a code investigation.
   - The part inside `<frozen-after-approval>` is the intent the human approved: Intent, Boundaries, the I/O and edge-case matrix, and Decisions.
   - Below it are the parts the agent owns: Code Map, Tasks & Acceptance, Implementation Notes and the Review Triage Log.
   - Compare its version in the `plan:` commit (as approved) with the final one (status `done`, tasks ticked, 23 triage rows).
3. **The deferred finding:** [`deferred-work.md`](../_bmad-output/implementation-artifacts/deferred-work.md) holds the one review finding that was put off.
4. **The adversarial review:** [`review-adversarial-2026-11-16.md`](../_bmad-output/implementation-artifacts/review-adversarial-2026-11-16.md).
5. **The code:** `git show <feat commit> --stat`. Start with `drizzle/0001_add_comments_and_activity.sql`, then `src/lib/db/schema.ts`, `src/lib/activity.ts`, `src/lib/tasks.ts`, `src/lib/comments.ts`, `src/lib/timeline.ts`, `src/app/actions.ts` and `src/components/Timeline.tsx`.
6. **The tests:** `tests/unit/{activity,comments,timeline,migration,actions}.test.ts` and `tests/e2e/comments.spec.ts`.

The two "spec" files do different jobs. SPEC.md says what to build, and any BMAD skill can read it. The implementation spec says how this one build does it, and only `bmad-build` uses it. Spec Kit and OpenSpec have the same split: `spec.md` versus `plan.md` and `tasks.md` in Spec Kit, and specs versus `design.md` and `tasks.md` in OpenSpec.

## What BMAD installed vs. what it produced

| Kind | Path | What it is |
|---|---|---|
| Installed | `_bmad/` | Config (`config.toml`, `core/`, `bmm/`), manifests (`_config/`), the Python scripts the skills run (`scripts/`), and the empty `custom/` and `render/` folders |
| Installed | `.claude/skills/bmad-*` (29 folders) | The skills. Agents: analyst, pm, architect, dev, ux. Planning: prd, architecture, epics, sprint planning. Spec and build: `bmad-spec`, `bmad-build`, `bmad-review`, `bmad-code-review`, ... |
| Produced | `_bmad-output/specs/spec-task-comments-and-activity-log/` | `SPEC.md`, `activity-entries.md`, `.memlog.md` (by `bmad-spec`) |
| Produced | `_bmad-output/implementation-artifacts/spec-task-comments-and-activity-log.md` | The implementation spec (by `bmad-build`) |
| Produced | `_bmad-output/implementation-artifacts/deferred-work.md` | One deferred review finding (by `bmad-build`) |
| Produced | `_bmad-output/implementation-artifacts/review-adversarial-2026-11-16.md` | The adversarial report (by `bmad-review`; the triage columns were added by the agent) |
| Produced | `drizzle/0001_add_comments_and_activity.sql`, `drizzle/meta/*` | New migration: two tables, two indexes, and a backfill of "created" entries |
| Produced | `src/**`, `tests/**`, `README.md` | Data layer, actions, timeline UI, comment counts, seed comments and tests |

## How the run went

1. **`bmad-spec` (about 3 minutes).**
   - It read "The request" section of FEATURE.md and logged 7 capabilities, 3 constraints and 3 non-goals to `.memlog.md`.
   - It found 8 open questions the request leaves open.
   - After the answers were logged, it rendered SPEC.md and the companion.
   - Its two self-checks both passed: coherence against its eight "Spec Law" rules, and preservation (every claim in the request landed somewhere).
2. **`bmad-build` steps 1 and 2: clarify and plan (about 3 minutes).**
   - Step 1 took SPEC.md as the starting intent. A file without `status` frontmatter is read as intent, not resumed.
   - Step 2 sent a subagent to investigate the code, then wrote the implementation spec with a Code Map of exact files and lines.
   - It raised 2 more open questions, passed the token gate and stopped at CHECKPOINT 1.
3. **`bmad-build` step 3: implement (about 7.5 minutes).**
   - A fresh subagent got BMAD's two-sentence prompt, word for word: read the spec and build it.
   - The main agent then checked the diff against all 10 tasks and every matrix row, and ran lint, typecheck and the unit tests.
4. **`bmad-build` steps 4 and 5: review and present (about 5 minutes).**
   - Three reviewer subagents ran in parallel:
     - Blind Hunter sees only the diff and must find at least N issues, scaled to the diff size (here N = 9).
     - Edge Case Hunter reads the diff, then the spec.
     - Verification Gap looks for changed behavior that no test pins.
   - The main agent judged all 23 findings and sent the patches back to the same implementation subagent.
   - Step 5 marked the spec `done`.
5. **`bmad-review`, adversarial lens (about 4 minutes, plus fixes).**
   - One context-free subagent reviewed the feature diff. It had to file at least ten findings and filed 15.
   - `bmad-review` only reports. The triage and the fixes were done afterwards, in their own commit.

## Decision log

Nobody answered at the keyboard, so I acted as the product owner who wrote FEATURE.md and answered every stop myself. The same rule applied on the other two branches.

| # | Where | Question or checkpoint | Answer | Why |
|---|---|---|---|---|
| 1 | Before `bmad-spec` | Which BMAD path? | `bmad-spec` then `bmad-build`, then `bmad-review` | `bmad-help`'s catalog puts `bmad-spec` before `bmad-build` for one feature. It produces a standalone spec, like the other branches have. The PRD track is for products. |
| 2 | `bmad-spec` | Express or guided? | Neither: the input was rich enough to extract directly | The skill asks only when input is sparse. |
| 3 | `bmad-spec`, Q1 | Description change: full old and new markdown, or a short line? | Short line, "changed the description" | Descriptions are long. The old and new text are still stored. |
| 4 | `bmad-spec`, Q2 | Backfill a "created" entry for existing tasks? | Yes, dated at each task's `created_at` | Every task gets a complete timeline. |
| 5 | `bmad-spec`, Q3 | Is a reorder inside a column a change? | No. A drag to another column is a status change. | No tracked field changes on a reorder. |
| 6 | `bmad-spec`, Q4 | Record a save that changes nothing? | No | "from Low to Low" is noise. |
| 7 | `bmad-spec`, Q5 | Labels: one entry per save, or one per label? | One per save, sorted names before and after | Matches "from what to what". Names survive a label rename or delete. |
| 8 | `bmad-spec`, Q6 | How do empty values read? | "none" | Short and clear. |
| 9 | `bmad-spec`, Q7 | When is a comment "edited"? | Only when the body changes after trimming | A save with no change should not add the marker. |
| 10 | `bmad-spec`, Q8 | Comment limits? | 1 to 20,000 characters after trimming | Same ceiling as the description. |
| 11 | `bmad-spec` | Break the spec into stories (`stories.yaml`)? | No | The request asks for one mixed timeline. Half of it would not match. |
| 12 | `bmad-build`, workflow start | May the workflow use subagents? | Yes | Investigation, implementation and review are all built around them. |
| 13 | `bmad-build` step 1, multi-goal check | Comments and activity could ship apart. Split? | Keep all goals | Same reason as #11. |
| 14 | `bmad-build` step 2, Q1 | Where does an edited comment sit? | Where it was written | The timeline order never moves. The "edited" marker shows the change. |
| 15 | `bmad-build` step 2, Q2 | Confirm before deleting a comment? | Yes, with `confirm()` | A misclick should not lose the text. |
| 16 | `bmad-build` step 2, token gate | The spec is about 2,000 tokens, above the 1,600 target. Split? | Keep full spec | It is one feature across DB, data layer and UI. |
| 17 | `bmad-build` CHECKPOINT 1 | Approve and continue / approve and stop / review | Approve and continue | Every capability had a task, and the matrix covered the risky cases: no-op saves, reorders, cascade delete and stale ids. |
| 18 | `bmad-build` step 4 triage | 23 findings | 15 patched (11 distinct fixes), 1 deferred, 7 rejected | Every row and its evidence is in the implementation spec's Review Triage Log. No intent gap or bad-spec finding, so no loop back. |
| 19 | `bmad-review` triage | 15 adversarial findings | 6 fixed, 9 rejected | Each decision and its reason is in the report. Four rejections cite the spec itself: description text is kept on purpose, comment deletes are not activity, and there is one user. |

## Honest notes and deviations

- **This is the second BMAD run on this branch.** The first, on 2026-09-23, used `bmad-build` alone. It had no standalone spec, and spec, code and review landed in one commit. It was replaced, not kept. This run started again from the install commit and regenerated all the code. The two runs reached most of the same product decisions. Where they differ, this run's answers are in the table above.
- **Commits at each phase.** `bmad-build` makes one commit at the end of step 5. I committed at its phase boundaries as well (after CHECKPOINT 1, after step 3 and after step 4), so the history shows each phase. Step 4 says "do not `git add`" while it stages the review diff. I committed before staging, so the reviewers saw the same diff either way.
- **Who wrote SPEC.md.** `bmad-spec` says SPEC.md is "derived" from `.memlog.md`, but in Claude Code the derivation is the agent writing the file from the log. No script renders it. The memlog entries were written with BMAD's own `memlog.py`.
- **"by user" in the memlog.** The answers to the open questions are tagged `by user` in `.memlog.md`. They came from me standing in as product owner, and a later memlog line says so. The log is append-only, so the tag stays as written.
- **The implementation prompt was not changed.** Step 3's two-sentence prompt went to the subagent word for word.
- **Triage is the agent's judgment.** BMAD gives the rules: what counts as `false`, when to reject a `low` finding, and how to route `patch`, `defer`, `bad_spec` and `intent_gap`. Applying them is a judgment call. The evidence for each call is written next to it, so it can be checked.
- **e2e ran in a copy of the tree.** A `next dev` was already running in this folder on port 3000, and Next refuses a second dev server in the same folder. Playwright's own Chromium was not installed either. Both e2e runs (after `bmad-build` and after the adversarial fixes) used a copy of the committed tree with the system Chrome. Both tests passed. The project's `playwright.config.ts` is unchanged.
- **CLAUDE.md was updated after the run.** The build review flagged that the new data-layer modules and `NotFoundError` were not written down for agents. BMAD's triage rules send any fix that edits agent-context files to `defer`, and the README patch did not cover CLAUDE.md. A later comparison with the other branches caught it, and a separate `docs:` commit updated the Architecture section.
- **A test fix during the adversarial fixes.** The new due-date e2e step first typed a date as MM/DD/YYYY, and the system Chrome read it day-first. It now types 09/09/2026, which reads the same either way, and presses Enter to commit.

## Rough counts

- **SPEC.md:** 7 capabilities, 4 constraints, 3 non-goals, 1 assumption, 1 companion. The memlog has 38 entries.
- **Implementation spec:** 12-row I/O and edge-case matrix, 2 decisions, 10 tasks, 3 acceptance criteria, 23 triage rows.
- **Reviews:** 23 findings in the built-in review and 15 in the adversarial pass. 17 distinct fixes in all.
- **Code:** 2 new tables, 4 new `src/lib` modules (`activity`, `comments`, `timeline`, `errors`), 1 new component (`Timeline`).
- **Tests:** 58 unit tests in 7 files, and 2 e2e tests. All pass.
