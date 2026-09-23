import { PRIORITY_RANK, STATUSES } from "./constants";
import type { Task } from "./tasks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-24" -> "Sep 24". Parsed by hand so server and browser agree. */
export function formatDueDate(dueDate: string): string {
  const [, month, day] = dueDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function isOverdue(task: Pick<Task, "dueDate" | "status">): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "canceled") return false;
  return task.dueDate < new Date().toISOString().slice(0, 10);
}

export function taskKey(id: number): string {
  return `TSK-${id}`;
}

export const SORTS = ["status", "priority", "due"] as const;
export type Sort = (typeof SORTS)[number];

/** Sorts a copy of the tasks for the list view. */
export function sortTasks(tasks: Task[], sort: Sort): Task[] {
  const byStatus = (a: Task, b: Task) =>
    STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.position - b.position;
  const byPriority = (a: Task, b: Task) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  // Tasks without a due date go last.
  const byDue = (a: Task, b: Task) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");

  const compare = { status: byStatus, priority: byPriority, due: byDue }[sort];
  return [...tasks].sort((a, b) => compare(a, b) || a.id - b.id);
}
