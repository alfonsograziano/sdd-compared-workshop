import { and, asc, count, eq, inArray, like, max, ne } from "drizzle-orm";
import type { ActivityField } from "./constants";
import { getDb, type Db } from "./db";
import {
  activities,
  comments,
  labels,
  taskLabels,
  tasks,
  type Activity,
  type Comment,
  type Label,
  type TaskRow,
} from "./db/schema";
import {
  commentBodySchema,
  createTaskSchema,
  moveTaskSchema,
  taskFiltersSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type MoveTaskInput,
  type TaskFilters,
  type UpdateTaskInput,
} from "./validation";

export type Task = TaskRow & { labels: Label[]; commentCount: number };

/** One line in a task's timeline: a comment or an activity entry. */
export type TimelineEntry = ({ kind: "comment" } & Comment) | ({ kind: "activity" } & Activity);

/** Thrown when a task or comment id does not exist. */
export class NotFoundError extends Error {
  name = "NotFoundError";
}

/** Either the database or an open transaction. */
type Conn = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Loads the labels and the comment count for a set of task rows and attaches them. */
function withLabels(db: Conn, rows: TaskRow[]): Task[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const links = db
    .select({ taskId: taskLabels.taskId, label: labels })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(inArray(taskLabels.taskId, ids))
    .orderBy(asc(labels.name))
    .all();

  const byTask = new Map<number, Label[]>();
  for (const { taskId, label } of links) {
    byTask.set(taskId, [...(byTask.get(taskId) ?? []), label]);
  }

  const counts = db
    .select({ taskId: comments.taskId, n: count() })
    .from(comments)
    .where(inArray(comments.taskId, ids))
    .groupBy(comments.taskId)
    .all();
  const commentsByTask = new Map(counts.map((c) => [c.taskId, c.n]));

  return rows.map((row) => ({
    ...row,
    labels: byTask.get(row.id) ?? [],
    commentCount: commentsByTask.get(row.id) ?? 0,
  }));
}

/** All tasks that match the filters, ordered by status column and position. */
export function listTasks(filters: TaskFilters = {}, db: Db = getDb()): Task[] {
  const { q, priority, labelId } = taskFiltersSchema.parse(filters);
  const conditions = [];
  if (q) conditions.push(like(tasks.title, `%${q}%`));
  if (priority) conditions.push(eq(tasks.priority, priority));
  if (labelId) {
    const withLabel = db
      .select({ id: taskLabels.taskId })
      .from(taskLabels)
      .where(eq(taskLabels.labelId, labelId));
    conditions.push(inArray(tasks.id, withLabel));
  }

  const rows = db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.status), asc(tasks.position), asc(tasks.id))
    .all();
  return withLabels(db, rows);
}

export function getTask(id: number, db: Conn = getDb()): Task | null {
  const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return row ? withLabels(db, [row])[0] : null;
}

export function listLabels(db: Db = getDb()): Label[] {
  return db.select().from(labels).orderBy(asc(labels.name)).all();
}

export function createTask(input: CreateTaskInput, db: Db = getDb()): Task {
  const data = createTaskSchema.parse(input);
  return db.transaction((tx) => {
    // New tasks go to the bottom of their column.
    const last = tx
      .select({ value: max(tasks.position) })
      .from(tasks)
      .where(eq(tasks.status, data.status))
      .get();
    const position = (last?.value ?? -1) + 1;

    const row = tx
      .insert(tasks)
      .values({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        position,
      })
      .returning()
      .get();

    setLabels(tx, row.id, data.labelIds);
    logActivity(tx, row.id, "created", null, null, row.createdAt);
    return getTask(row.id, tx)!;
  });
}

export function updateTask(id: number, input: UpdateTaskInput, db: Db = getDb()): Task {
  const { labelIds, ...fields } = updateTaskSchema.parse(input);
  return db.transaction((tx) => {
    const current = getTask(id, tx);
    if (!current) throw new NotFoundError(`Task ${id} not found`);

    // Keep only the fields that really change. A save that changes nothing writes nothing.
    const changed: Partial<Pick<TaskRow, TrackedField>> = {};
    for (const field of TRACKED_FIELDS) {
      const value = fields[field];
      if (value !== undefined && value !== current[field]) Object.assign(changed, { [field]: value });
    }
    const labelsChange = labelIds !== undefined && !sameIds(labelIds, current.labels.map((l) => l.id));
    if (Object.keys(changed).length === 0 && !labelsChange) return current;

    const now = new Date();
    const changes: Partial<TaskRow> = { ...changed, updatedAt: now };
    // A task that changes column through the form goes to the bottom of the new column.
    if (changed.status) {
      const last = tx
        .select({ value: max(tasks.position) })
        .from(tasks)
        .where(eq(tasks.status, changed.status))
        .get();
      changes.position = (last?.value ?? -1) + 1;
    }
    tx.update(tasks).set(changes).where(eq(tasks.id, id)).run();

    for (const field of TRACKED_FIELDS) {
      if (field in changed) logActivity(tx, id, field, current[field], changed[field] ?? null, now);
    }
    if (labelsChange) {
      setLabels(tx, id, labelIds);
      const after = getTask(id, tx)!;
      logActivity(tx, id, "labels", labelNames(current.labels), labelNames(after.labels), now);
    }
    return getTask(id, tx)!;
  });
}

/**
 * Moves a task to a column, right before `beforeId` (or last when it is null),
 * then renumbers the column so positions stay 0, 1, 2, ...
 */
export function moveTask(id: number, input: MoveTaskInput, db: Db = getDb()): Task {
  const { status, beforeId } = moveTaskSchema.parse(input);
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!current) throw new NotFoundError(`Task ${id} not found`);

    const column = tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.status, status), ne(tasks.id, id)))
      .orderBy(asc(tasks.position), asc(tasks.id))
      .all()
      .map((t) => t.id);

    const index = beforeId === null ? -1 : column.indexOf(beforeId);
    column.splice(index === -1 ? column.length : index, 0, id);

    const now = new Date();
    column.forEach((taskId, position) => {
      tx.update(tasks)
        .set(taskId === id ? { status, position, updatedAt: now } : { position })
        .where(eq(tasks.id, taskId))
        .run();
    });
    // Reordering inside the same column is not recorded.
    if (status !== current.status) logActivity(tx, id, "status", current.status, status, now);
    return getTask(id, tx)!;
  });
}

export function deleteTask(id: number, db: Db = getDb()): void {
  // task_labels, comments and activities rows go away through ON DELETE CASCADE.
  db.delete(tasks).where(eq(tasks.id, id)).run();
}

function setLabels(db: Conn, taskId: number, labelIds: number[]) {
  db.delete(taskLabels).where(eq(taskLabels.taskId, taskId)).run();
  const unique = [...new Set(labelIds)];
  if (unique.length > 0) {
    db.insert(taskLabels)
      .values(unique.map((labelId) => ({ taskId, labelId })))
      .run();
  }
}

/** The task fields whose changes show up in the timeline, besides labels. */
const TRACKED_FIELDS = ["title", "description", "status", "priority", "dueDate"] as const;
type TrackedField = (typeof TRACKED_FIELDS)[number];

function logActivity(
  db: Conn,
  taskId: number,
  field: ActivityField,
  fromValue: string | null,
  toValue: string | null,
  createdAt: Date,
) {
  db.insert(activities).values({ taskId, field, fromValue, toValue, createdAt }).run();
}

function sameIds(a: number[], b: number[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((id) => right.has(id));
}

/** Label names as stored in an activity entry, or null when there are none. */
function labelNames(list: Label[]): string | null {
  return list.length === 0 ? null : list.map((l) => l.name).join(", ");
}

/** Comments and activity entries of a task, oldest first. */
export function getTimeline(taskId: number, db: Db = getDb()): TimelineEntry[] {
  const commentRows = db
    .select()
    .from(comments)
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .all();
  const activityRows = db
    .select()
    .from(activities)
    .where(eq(activities.taskId, taskId))
    .orderBy(asc(activities.createdAt), asc(activities.id))
    .all();

  const entries: TimelineEntry[] = [
    ...activityRows.map((a) => ({ kind: "activity" as const, ...a })),
    ...commentRows.map((c) => ({ kind: "comment" as const, ...c })),
  ];
  // A stable sort keeps each table's id order for entries written in the same millisecond.
  return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function addComment(taskId: number, body: string, db: Db = getDb()): Comment {
  const text = commentBodySchema.parse(body);
  return db.transaction((tx) => {
    const task = tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) throw new NotFoundError(`Task ${taskId} not found`);
    return tx.insert(comments).values({ taskId, body: text }).returning().get();
  });
}

/** Changes a comment's body. The "edited" time is set only when the body really changes. */
export function updateComment(id: number, body: string, db: Db = getDb()): Comment {
  const text = commentBodySchema.parse(body);
  return db.transaction((tx) => {
    const current = tx.select().from(comments).where(eq(comments.id, id)).get();
    if (!current) throw new NotFoundError(`Comment ${id} not found`);
    if (current.body === text) return current;
    return tx
      .update(comments)
      .set({ body: text, editedAt: new Date() })
      .where(eq(comments.id, id))
      .returning()
      .get();
  });
}

export function deleteComment(id: number, db: Db = getDb()): void {
  db.delete(comments).where(eq(comments.id, id)).run();
}
