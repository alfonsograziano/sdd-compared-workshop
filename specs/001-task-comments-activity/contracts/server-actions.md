# Contract: Server Actions and data-layer functions

The app has no HTTP API. Its interface to the browser is the set of Server Actions in
`src/app/actions.ts`. This contract lists the new ones and the data-layer functions behind them.

## Server Actions (`src/app/actions.ts`)

All return `ActionResult = { ok: true; id: number } | { ok: false; error: string }` through the
existing `run()` helper, which calls `revalidatePath("/", "layout")` on success and turns a
`ZodError` into `{ ok: false, error }`.

| Action | Input | On success | Errors |
|---|---|---|---|
| `createCommentAction(taskId: number, body: string)` | `taskId` positive int (validated in the action); `body` by `commentBodySchema` | `{ ok: true, id: <new comment id> }` | `{ ok: false, error: "Comment cannot be empty" }`, too long; throws if the task does not exist |
| `updateCommentAction(id: number, body: string)` | `id` positive int; `body` by `commentBodySchema` | `{ ok: true, id }` | same validation errors; throws if the comment does not exist |
| `deleteCommentAction(id: number)` | `id` positive int | `{ ok: true, id }` | none (deleting a missing comment is a no-op) |

The existing `createTaskAction`, `updateTaskAction`, `moveTaskAction` and `deleteTaskAction`
keep their signatures. Their activity side effects happen in the data layer.

## Data layer: `src/lib/comments.ts`

Every function takes an optional last argument `db: Db = getDb()`.

| Function | Behavior |
|---|---|
| `listComments(taskId)` | `Comment[]` for the task, oldest first |
| `createComment(taskId, body)` | validates body; throws `Task <id> not found` if missing; returns the new `Comment` with `updatedAt: null` |
| `updateComment(id, body)` | validates body; throws `Comment <id> not found`; sets `updatedAt` only if the trimmed body differs; returns the `Comment` |
| `deleteComment(id)` | deletes the row; no error when missing |
| `countComments(taskIds)` | `Map<taskId, count>` for the given ids, one grouped query |

## Data layer: `src/lib/activity.ts`

| Function | Behavior |
|---|---|
| `recordActivity(conn, taskId, entries, at)` | inserts rows; `conn` may be a transaction; `entries` is `{ field, oldValue, newValue }[]` |
| `listActivity(taskId)` | `Activity[]` for the task, oldest first |
| `describeActivity(entry)` | pure; returns `{ text: string; details?: { old: string; new: string } }`, for example `{ text: "changed priority from Medium to Urgent" }` |

## Data layer: `src/lib/timeline.ts`

| Function | Behavior |
|---|---|
| `getTimeline(taskId)` | loads comments and activity and returns `TimelineItem[]` via `mergeTimeline` |
| `mergeTimeline(comments, activity)` | pure; sorted by time, activity before comment on ties, then id |

## Changed: `src/lib/tasks.ts`

- `Task` gains `commentCount: number` (from `countComments`).
- `createTask`, `updateTask`, `moveTask` call `recordActivity` inside their transaction as listed
  in [data-model.md](../data-model.md).
- `deleteTask` is unchanged; cascade removes comments and activity.
