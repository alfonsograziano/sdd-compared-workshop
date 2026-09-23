import { and, asc, count, eq, inArray, like, max, ne } from "drizzle-orm";
import { getDb, type Db } from "./db";
import {
  comments,
  labels,
  taskActivity,
  taskLabels,
  tasks,
  type ActivityField,
  type ActivityRow,
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

/** Either the database or an open transaction. */
type Conn = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Loads the labels and comment counts for a set of task rows and attaches them. */
function withLabels(db: Conn, rows: TaskRow[]): Task[] {
  if (rows.length === 0) return [];
  const links = db
    .select({ taskId: taskLabels.taskId, label: labels })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(
      inArray(
        taskLabels.taskId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(labels.name))
    .all();

  const byTask = new Map<number, Label[]>();
  for (const { taskId, label } of links) {
    byTask.set(taskId, [...(byTask.get(taskId) ?? []), label]);
  }
  const counts = new Map(
    db
      .select({ taskId: comments.taskId, value: count() })
      .from(comments)
      .where(
        inArray(
          comments.taskId,
          rows.map((r) => r.id),
        ),
      )
      .groupBy(comments.taskId)
      .all()
      .map((c) => [c.taskId, c.value]),
  );
  return rows.map((row) => ({ ...row, labels: byTask.get(row.id) ?? [], commentCount: counts.get(row.id) ?? 0 }));
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
    tx.insert(taskActivity).values({ taskId: row.id, field: "created", createdAt: row.createdAt }).run();
    return getTask(row.id, tx)!;
  });
}

export function updateTask(id: number, input: UpdateTaskInput, db: Db = getDb()): Task {
  const { labelIds, ...fields } = updateTaskSchema.parse(input);
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!current) throw new Error(`Task ${id} not found`);
    const labelsBefore = labelNames(tx, id);

    const now = new Date();
    const changes: Partial<TaskRow> = { ...fields, updatedAt: now };
    // A task that changes column through the form goes to the bottom of the new column.
    if (fields.status && fields.status !== current.status) {
      const last = tx
        .select({ value: max(tasks.position) })
        .from(tasks)
        .where(eq(tasks.status, fields.status))
        .get();
      changes.position = (last?.value ?? -1) + 1;
    }

    tx.update(tasks).set(changes).where(eq(tasks.id, id)).run();
    if (labelIds) setLabels(tx, id, labelIds);

    // One activity entry per tracked field whose value really changed.
    const diffs: [ActivityField, string | null, string | null | undefined][] = [
      ["title", current.title, fields.title],
      ["description", current.description, fields.description],
      ["status", current.status, fields.status],
      ["priority", current.priority, fields.priority],
      ["due_date", current.dueDate, fields.dueDate],
      ["labels", labelsBefore, labelIds ? labelNames(tx, id) : undefined],
    ];
    for (const [field, from, to] of diffs) {
      if (to !== undefined && to !== from) recordActivity(tx, id, field, from, to, now);
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
    if (!current) throw new Error(`Task ${id} not found`);

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
    // Reordering inside a column is not recorded, only a change of column.
    if (status !== current.status) recordActivity(tx, id, "status", current.status, status, now);
    return getTask(id, tx)!;
  });
}

export function deleteTask(id: number, db: Db = getDb()): void {
  // task_labels, comments and task_activity rows go away through ON DELETE CASCADE.
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

/** The task's label names, sorted and joined with ", ", or null when it has none. */
function labelNames(db: Conn, taskId: number): string | null {
  const names = db
    .select({ name: labels.name })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(eq(taskLabels.taskId, taskId))
    .orderBy(asc(labels.name))
    .all()
    .map((l) => l.name);
  return names.length > 0 ? names.join(", ") : null;
}

function recordActivity(
  db: Conn,
  taskId: number,
  field: ActivityField,
  fromValue: string | null,
  toValue: string | null,
  createdAt: Date,
) {
  db.insert(taskActivity).values({ taskId, field, fromValue, toValue, createdAt }).run();
}

// ---------------------------------------------------------------------------
// Comments

export function addComment(taskId: number, body: string, db: Db = getDb()): Comment {
  const text = commentBodySchema.parse(body);
  const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw new Error(`Task ${taskId} not found`);
  return db.insert(comments).values({ taskId, body: text, createdAt: new Date() }).returning().get();
}

/** Changes a comment's body. It is marked as edited only when the body really changes. */
export function updateComment(id: number, body: string, db: Db = getDb()): Comment {
  const text = commentBodySchema.parse(body);
  const current = db.select().from(comments).where(eq(comments.id, id)).get();
  if (!current) throw new Error(`Comment ${id} not found`);
  if (current.body === text) return current;
  return db.update(comments).set({ body: text, editedAt: new Date() }).where(eq(comments.id, id)).returning().get();
}

/** Deletes a comment and returns the id of the task it belonged to, or null if it did not exist. */
export function deleteComment(id: number, db: Db = getDb()): number | null {
  const row = db.delete(comments).where(eq(comments.id, id)).returning({ taskId: comments.taskId }).get();
  return row?.taskId ?? null;
}

// ---------------------------------------------------------------------------
// Timeline

export type TimelineEntry = ({ kind: "comment" } & Comment) | ({ kind: "activity" } & ActivityRow);

/**
 * Comments and activity of a task in one list, oldest first. A comment sits where it was
 * written, not where it was last edited. At the same millisecond, activity comes before
 * comments, then the lower id comes first.
 */
export function getTimeline(taskId: number, db: Db = getDb()): TimelineEntry[] {
  const activity = db
    .select()
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .all()
    .map((a) => ({ kind: "activity" as const, ...a }));
  const notes = db
    .select()
    .from(comments)
    .where(eq(comments.taskId, taskId))
    .all()
    .map((c) => ({ kind: "comment" as const, ...c }));
  const rank = { activity: 0, comment: 1 };
  return [...activity, ...notes].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || rank[a.kind] - rank[b.kind] || a.id - b.id,
  );
}
