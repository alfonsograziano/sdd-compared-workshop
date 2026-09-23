import { describe, expect, it } from "vitest";
import { filtersFromSearchParams } from "@/lib/filters";
import { formatDueDate, isOverdue, sortTasks } from "@/lib/format";
import type { Task } from "@/lib/tasks";

function task(fields: Partial<Task>): Task {
  const now = new Date();
  return {
    id: 1,
    title: "t",
    description: "",
    status: "todo",
    priority: "none",
    dueDate: null,
    position: 0,
    createdAt: now,
    updatedAt: now,
    labels: [],
    commentCount: 0,
    ...fields,
  };
}

describe("sortTasks", () => {
  const tasks = [
    task({ id: 1, status: "done", priority: "low", dueDate: null }),
    task({ id: 2, status: "backlog", priority: "urgent", dueDate: "2026-10-01" }),
    task({ id: 3, status: "in_progress", priority: "medium", dueDate: "2026-09-01" }),
  ];

  it("sorts by status in board order", () => {
    expect(sortTasks(tasks, "status").map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("sorts by priority, most urgent first", () => {
    expect(sortTasks(tasks, "priority").map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it("sorts by due date, with no date last", () => {
    expect(sortTasks(tasks, "due").map((t) => t.id)).toEqual([3, 2, 1]);
  });
});

describe("helpers", () => {
  it("formats a due date without time zone surprises", () => {
    expect(formatDueDate("2026-01-05")).toBe("Jan 5");
  });

  it("never marks finished tasks as overdue", () => {
    expect(isOverdue({ dueDate: "2000-01-01", status: "todo" })).toBe(true);
    expect(isOverdue({ dueDate: "2000-01-01", status: "done" })).toBe(false);
  });

  it("reads filters from the URL and drops bad values", () => {
    expect(filtersFromSearchParams({ q: "bug", priority: "high", label: "2" })).toEqual({
      q: "bug",
      priority: "high",
      labelId: 2,
    });
    expect(filtersFromSearchParams({ priority: "nope", label: "abc", q: "" })).toEqual({});
  });
});
