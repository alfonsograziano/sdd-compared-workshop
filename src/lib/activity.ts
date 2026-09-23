import { asc, eq } from "drizzle-orm";
import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from "./constants";
import { getDb, type Conn, type Db } from "./db";
import { taskActivity, type Activity, type ActivityField } from "./db/schema";
import { formatDueDate } from "./format";

/** One change to record. `field: null` means "created the task". */
export type ActivityChange = Pick<Activity, "field" | "oldValue" | "newValue">;

/** Writes activity rows. Pass the open transaction so the change and its record are saved together. */
export function recordActivity(conn: Conn, taskId: number, changes: ActivityChange[], at: Date = new Date()): void {
  if (changes.length === 0) return;
  conn
    .insert(taskActivity)
    .values(changes.map((c) => ({ taskId, field: c.field, oldValue: c.oldValue, newValue: c.newValue, createdAt: at })))
    .run();
}

/** The task's activity, oldest first. */
export function listActivity(taskId: number, db: Db = getDb()): Activity[] {
  return db
    .select()
    .from(taskActivity)
    .where(eq(taskActivity.taskId, taskId))
    .orderBy(asc(taskActivity.createdAt), asc(taskActivity.id))
    .all();
}

/** The fields of a task that the activity log compares. */
export type TrackedTask = {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  labels: { name: string }[];
};

/** One change per tracked field that differs between two versions of a task. */
export function diffTask(before: TrackedTask, after: TrackedTask): ActivityChange[] {
  const labelNames = (t: TrackedTask) => JSON.stringify(t.labels.map((l) => l.name).sort());
  const pairs: [ActivityField, string | null, string | null][] = [
    ["title", before.title, after.title],
    ["description", before.description, after.description],
    ["status", before.status, after.status],
    ["priority", before.priority, after.priority],
    ["labels", labelNames(before), labelNames(after)],
    ["due_date", before.dueDate, after.dueDate],
  ];
  return pairs
    .filter(([, oldValue, newValue]) => oldValue !== newValue)
    .map(([field, oldValue, newValue]) => ({ field, oldValue, newValue }));
}

export type ActivityDescription = { text: string; details?: { before: string; after: string } };

/** Turns a stored entry into a sentence, for example "changed priority from Medium to Urgent". */
export function describeActivity({ field, oldValue, newValue }: ActivityChange): ActivityDescription {
  switch (field) {
    case null:
      return { text: "created the task" };
    case "title":
      return { text: `changed title from "${oldValue ?? ""}" to "${newValue ?? ""}"` };
    case "description":
      return { text: "changed the description", details: { before: oldValue ?? "", after: newValue ?? "" } };
    case "status":
      return { text: `changed status from ${statusName(oldValue)} to ${statusName(newValue)}` };
    case "priority":
      return { text: `changed priority from ${priorityName(oldValue)} to ${priorityName(newValue)}` };
    case "due_date":
      return { text: `changed due date from ${dueDateName(oldValue)} to ${dueDateName(newValue)}` };
    case "labels":
      return { text: describeLabels(parseNames(oldValue), parseNames(newValue)) };
  }
}

function statusName(value: string | null) {
  return STATUS_LABELS[value as Status] ?? value ?? "none";
}

function priorityName(value: string | null) {
  return PRIORITY_LABELS[value as Priority] ?? value ?? "none";
}

function dueDateName(value: string | null) {
  return value ? formatDueDate(value) : "no due date";
}

function parseNames(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function describeLabels(before: string[], after: string[]) {
  const added = after.filter((name) => !before.includes(name));
  const removed = before.filter((name) => !after.includes(name));
  const part = (verb: string, names: string[]) =>
    names.length ? `${verb} ${names.length === 1 ? "label" : "labels"} ${names.join(", ")}` : null;
  return [part("added", added), part("removed", removed)].filter(Boolean).join(" and ") || "changed labels";
}
