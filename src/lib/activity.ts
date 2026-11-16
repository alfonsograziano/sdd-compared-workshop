import { asc, eq } from "drizzle-orm";
import {
  ACTIVITY_FIELDS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ActivityField,
  type Priority,
  type Status,
} from "./constants";
import { getDb, type Conn } from "./db";
import { taskActivity, type ActivityRow } from "./db/schema";
import { formatDueDate } from "./format";

/** One change to record. A null field means "created the task". */
export type ActivityChange = Pick<ActivityRow, "field" | "oldValue" | "newValue">;

/** The tracked fields of a task, with labels as names. */
export type TaskSnapshot = {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  labels: string[];
};

/**
 * Writes activity entries for a task. Only createTask, updateTask and moveTask
 * call this, inside the transaction that makes the change.
 */
export function recordActivity(tx: Conn, taskId: number, changes: ActivityChange[], at: Date): void {
  if (changes.length === 0) return;
  tx.insert(taskActivity)
    .values(changes.map((c) => ({ taskId, ...c, createdAt: at })))
    .run();
}

/** The "created the task" entry. */
export const CREATED: ActivityChange = { field: null, oldValue: null, newValue: null };

/** Turns a field value into the text stored in the activity table. */
function storedValue(field: ActivityField, snapshot: TaskSnapshot): string | null {
  if (field === "labels") return JSON.stringify([...snapshot.labels].sort());
  return snapshot[field];
}

/** One change per tracked field whose value differs. Unchanged fields record nothing. */
export function diffTask(before: TaskSnapshot, after: TaskSnapshot): ActivityChange[] {
  const changes: ActivityChange[] = [];
  for (const field of ACTIVITY_FIELDS) {
    const oldValue = storedValue(field, before);
    const newValue = storedValue(field, after);
    if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
  }
  return changes;
}

/** All activity for one task, oldest first. */
export function listActivity(taskId: number, db: Conn = getDb()): ActivityRow[] {
  return db
    .select()
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .orderBy(asc(taskActivity.createdAt), asc(taskActivity.id))
    .all();
}

function labelList(value: string | null): string {
  const names: unknown = value ? JSON.parse(value) : [];
  return Array.isArray(names) && names.length > 0 ? names.join(", ") : "none";
}

function dueDate(value: string | null): string {
  return value ? formatDueDate(value) : "none";
}

function status(value: string | null): string {
  return value ? (STATUS_LABELS[value as Status] ?? value) : "none";
}

function priority(value: string | null): string {
  return value ? (PRIORITY_LABELS[value as Priority] ?? value) : "none";
}

/** The sentence the timeline shows for an entry, for example "changed priority from Medium to Urgent". */
export function describeActivity({ field, oldValue, newValue }: ActivityChange): string {
  switch (field) {
    case null:
      return "created the task";
    case "title":
      return `changed the title from ${oldValue ?? ""} to ${newValue ?? ""}`;
    case "description":
      return "changed the description";
    case "status":
      return `changed status from ${status(oldValue)} to ${status(newValue)}`;
    case "priority":
      return `changed priority from ${priority(oldValue)} to ${priority(newValue)}`;
    case "labels":
      return `changed labels from ${labelList(oldValue)} to ${labelList(newValue)}`;
    case "dueDate":
      return `changed due date from ${dueDate(oldValue)} to ${dueDate(newValue)}`;
  }
}
