import { and, asc, eq, inArray, like, max, ne } from "drizzle-orm";
import { getDb, type Conn, type Db } from "./db";
import { labels, taskLabels, tasks, type Label, type TaskRow } from "./db/schema";
import {
  createTaskSchema,
  moveTaskSchema,
  taskFiltersSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type MoveTaskInput,
  type TaskFilters,
  type UpdateTaskInput,
} from "./validation";

export type Task = TaskRow & { labels: Label[] };

/** Loads the labels for a set of task rows and attaches them. */
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
  return rows.map((row) => ({ ...row, labels: byTask.get(row.id) ?? [] }));
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
    return getTask(row.id, tx)!;
  });
}

export function updateTask(id: number, input: UpdateTaskInput, db: Db = getDb()): Task {
  const { labelIds, ...fields } = updateTaskSchema.parse(input);
  return db.transaction((tx) => {
    const current = tx.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!current) throw new Error(`Task ${id} not found`);

    const changes: Partial<TaskRow> = { ...fields, updatedAt: new Date() };
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
    return getTask(id, tx)!;
  });
}

export function deleteTask(id: number, db: Db = getDb()): void {
  // task_labels rows go away through ON DELETE CASCADE.
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
