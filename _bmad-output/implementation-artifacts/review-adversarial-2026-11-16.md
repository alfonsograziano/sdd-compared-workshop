# Adversarial review: comments and activity log

- **Skill:** `bmad-review`, lens `adversarial` only (asked for by name).
- **Content:** `git diff 34075e8 HEAD`, the code and tests from bmad-build (spec docs and the drizzle snapshot left out). Code diff, 70 KB.
- **Reviewer:** one context-free subagent. It must file at least ten findings and treats zero as a reason to look again.
- **Date:** 2026-11-16.

bmad-review reports findings and stops. The triage columns below were added afterwards by the agent running the workflow: what was fixed in the next commit and why the rest were rejected.

| # | Location | Problem | Decision | Why |
|---|---|---|---|---|
| 1 | `src/lib/activity.ts:73 (dueDate) via format.ts:7` | Due-date entries print month and day only, so a change of year reads 'from Jan 5 to Jan 5' | fix | Real: formatDueDate drops the year. |
| 2 | `src/components/TaskDetail.tsx:167` | The date input saves on every change event; Chrome fires one per partial year typed (0002, 0020, 0202, 2026) | fix | Real: save-on-change predates the feature, but now every save is a timeline entry. |
| 3 | `src/lib/activity.ts:86-103, schema.ts:77` | describeActivity has no default branch; SQLite does not enforce the field enum | reject | Only writer is the typed recordActivity; needs a hand-edited DB. Same call as build triage #18. |
| 4 | `src/lib/activity.ts:68-71` | JSON.parse on stored label values has no try/catch | reject | Only writer is JSON.stringify in recordActivity. Same call as build triage #16. |
| 5 | `src/lib/activity.ts:42-46, timeline.ts` | Every description save stores both full texts, never shown | reject | Intent: SPEC memlog decision keeps the old/new text stored on purpose. |
| 6 | `src/lib/activity.ts:91` | Title values are unquoted, so a title containing ' to ' misreads | fix | Real and a one-line change. |
| 7 | `src/lib/comments.ts:29-42, Timeline.tsx:53-61` | Comment edits from two tabs overwrite each other without warning | reject | One user, last write wins; concurrency control is outside the intent. |
| 8 | `src/components/Timeline.tsx:146-187` | An unsent comment draft is lost on navigation | reject | Feature request, not a defect against the spec. |
| 9 | `src/components/Timeline.tsx:81,94` | Edit/Delete labels use minute-precision time; two comments in one minute share a name | fix | Real, and the fix is a string change. |
| 10 | `src/lib/timeline.ts:30-34` | Same-millisecond ties put activity before comments regardless of real order | reject | A human cannot comment and change a task in the same millisecond; tie order is stable and tested. |
| 11 | `src/lib/tasks.ts:119-120` | A save that changes nothing still bumps updatedAt | fix | Real: the header and the timeline disagree. |
| 12 | `README.md:84` | README says every missing id throws NotFoundError, but deleteTask is a silent no-op | fix | Real: deleteTask never throws. |
| 13 | `src/lib/comments.ts:44-47` | Deleting a comment leaves no trace | reject | SPEC non-goal: comments do not create activity entries. |
| 14 | `src/lib/comments.ts:50-59` | countComments uses inArray over all task ids; can pass SQLite's variable limit | reject | Same pattern as the existing label lookup; the limit is far beyond a one-user board. |
| 15 | `src/lib/activity.ts:31-36` | recordActivity is exported, so any module can write activity; label deletes are not recorded | reject | activity.ts is the data layer the project rules name; the app has no label rename or delete. |

Totals: 15 findings, 6 fixed, 9 rejected.

## Findings (bmad-review JSON output)

```json
[
  {
    "lens": "adversarial",
    "location": "src/lib/activity.ts:73 (dueDate) via format.ts:7",
    "trigger_condition": "Due-date entries print month and day only, so a change of year reads 'from Jan 5 to Jan 5'",
    "guard_snippet": "Show the year when old and new dates differ in year",
    "potential_consequence": "The audit line looks wrong and loses the change"
  },
  {
    "lens": "adversarial",
    "location": "src/components/TaskDetail.tsx:167",
    "trigger_condition": "The date input saves on every change event; Chrome fires one per partial year typed (0002, 0020, 0202, 2026)",
    "guard_snippet": "Save the due date on blur, not on change",
    "potential_consequence": "Typing one date writes 3-4 junk activity entries"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/activity.ts:86-103, schema.ts:77",
    "trigger_condition": "describeActivity has no default branch; SQLite does not enforce the field enum",
    "guard_snippet": "Add a default branch or a CHECK constraint",
    "potential_consequence": "A row with an unknown field renders with no text"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/activity.ts:68-71",
    "trigger_condition": "JSON.parse on stored label values has no try/catch",
    "guard_snippet": "Fall back to the raw string on a parse error",
    "potential_consequence": "One malformed row makes the task page 500"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/activity.ts:42-46, timeline.ts",
    "trigger_condition": "Every description save stores both full texts, never shown",
    "guard_snippet": "Store null or an excerpt for description",
    "potential_consequence": "task_activity grows by up to 40 KB per save"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/activity.ts:91",
    "trigger_condition": "Title values are unquoted, so a title containing ' to ' misreads",
    "guard_snippet": "Quote the old and new titles",
    "potential_consequence": "'changed the title from Move A to B to Move B to C' is ambiguous"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/comments.ts:29-42, Timeline.tsx:53-61",
    "trigger_condition": "Comment edits from two tabs overwrite each other without warning",
    "guard_snippet": "Send the original body and reject a stale update",
    "potential_consequence": "Lost comment text"
  },
  {
    "lens": "adversarial",
    "location": "src/components/Timeline.tsx:146-187",
    "trigger_condition": "An unsent comment draft is lost on navigation",
    "guard_snippet": "Persist the draft or warn before unload",
    "potential_consequence": "A long draft disappears"
  },
  {
    "lens": "adversarial",
    "location": "src/components/Timeline.tsx:81,94",
    "trigger_condition": "Edit/Delete labels use minute-precision time; two comments in one minute share a name",
    "guard_snippet": "Add the comment id to the label",
    "potential_consequence": "Screen-reader users cannot tell the buttons apart"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/timeline.ts:30-34",
    "trigger_condition": "Same-millisecond ties put activity before comments regardless of real order",
    "guard_snippet": "One shared sequence or a monotonic bump",
    "potential_consequence": "Order can contradict reality"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/tasks.ts:119-120",
    "trigger_condition": "A save that changes nothing still bumps updatedAt",
    "guard_snippet": "Only bump updatedAt when something changed",
    "potential_consequence": "'Updated' moves while the timeline shows nothing"
  },
  {
    "lens": "adversarial",
    "location": "README.md:84",
    "trigger_condition": "README says every missing id throws NotFoundError, but deleteTask is a silent no-op",
    "guard_snippet": "Narrow the sentence",
    "potential_consequence": "Developers rely on a guarantee that does not hold"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/comments.ts:44-47",
    "trigger_condition": "Deleting a comment leaves no trace",
    "guard_snippet": "Soft delete or an activity entry",
    "potential_consequence": "History can be rewritten"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/comments.ts:50-59",
    "trigger_condition": "countComments uses inArray over all task ids; can pass SQLite's variable limit",
    "guard_snippet": "Use a subquery or batch",
    "potential_consequence": "Board crashes past 32,766 tasks"
  },
  {
    "lens": "adversarial",
    "location": "src/lib/activity.ts:31-36",
    "trigger_condition": "recordActivity is exported, so any module can write activity; label deletes are not recorded",
    "guard_snippet": "Make it private or lint-guard it",
    "potential_consequence": "Fake or missing entries"
  }
]
```
