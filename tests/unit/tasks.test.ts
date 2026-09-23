import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/lib/db";
import { labels } from "@/lib/db/schema";
import { seed } from "@/lib/seed";
import {
  createTask,
  deleteTask,
  getTask,
  listLabels,
  listTasks,
  moveTask,
  updateTask,
} from "@/lib/tasks";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

function titles(status: string) {
  return listTasks({}, db)
    .filter((t) => t.status === status)
    .map((t) => t.title);
}

describe("createTask", () => {
  it("uses defaults and puts the task last in its column", () => {
    const a = createTask({ title: "First" }, db);
    const b = createTask({ title: "Second" }, db);
    expect(a).toMatchObject({ status: "backlog", priority: "none", description: "", dueDate: null, labels: [] });
    expect(b.position).toBeGreaterThan(a.position);
    expect(a.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty title", () => {
    expect(() => createTask({ title: "   " }, db)).toThrow();
  });

  it("rejects a bad due date", () => {
    expect(() => createTask({ title: "x", dueDate: "tomorrow" }, db)).toThrow();
  });

  it("attaches labels", () => {
    const [bug, docs] = db
      .insert(labels)
      .values([
        { name: "Bug", color: "#f00" },
        { name: "Docs", color: "#ff0" },
      ])
      .returning()
      .all();
    const task = createTask({ title: "x", labelIds: [docs.id, bug.id] }, db);
    expect(task.labels.map((l) => l.name)).toEqual(["Bug", "Docs"]);
  });
});

describe("updateTask", () => {
  it("changes only the given fields and bumps updatedAt", async () => {
    const task = createTask({ title: "Old", priority: "low" }, db);
    await new Promise((r) => setTimeout(r, 5));
    const updated = updateTask(task.id, { priority: "urgent", dueDate: "2026-12-31" }, db);
    expect(updated).toMatchObject({ title: "Old", priority: "urgent", dueDate: "2026-12-31" });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
  });

  it("replaces labels", () => {
    const [a, b] = db
      .insert(labels)
      .values([
        { name: "A", color: "#000" },
        { name: "B", color: "#fff" },
      ])
      .returning()
      .all();
    const task = createTask({ title: "x", labelIds: [a.id] }, db);
    expect(updateTask(task.id, { labelIds: [b.id] }, db).labels.map((l) => l.name)).toEqual(["B"]);
    expect(updateTask(task.id, { labelIds: [] }, db).labels).toEqual([]);
  });

  it("moves the task to the end of the new column when status changes", () => {
    createTask({ title: "Already done", status: "done" }, db);
    const task = createTask({ title: "Finish me", status: "todo" }, db);
    updateTask(task.id, { status: "done" }, db);
    expect(titles("done")).toEqual(["Already done", "Finish me"]);
  });

  it("throws for a missing task", () => {
    expect(() => updateTask(999, { title: "x" }, db)).toThrow(/not found/);
  });
});

describe("moveTask", () => {
  it("reorders inside a column", () => {
    createTask({ title: "A", status: "todo" }, db);
    createTask({ title: "B", status: "todo" }, db);
    const c = createTask({ title: "C", status: "todo" }, db);
    const a = listTasks({}, db).find((t) => t.title === "A")!;
    moveTask(c.id, { status: "todo", beforeId: a.id }, db);
    expect(titles("todo")).toEqual(["C", "A", "B"]);
  });

  it("moves to another column, before a task or at the end", () => {
    const a = createTask({ title: "A", status: "todo" }, db);
    const b = createTask({ title: "B", status: "todo" }, db);
    const x = createTask({ title: "X", status: "done" }, db);
    moveTask(a.id, { status: "done", beforeId: x.id }, db);
    moveTask(b.id, { status: "done", beforeId: null }, db);
    expect(titles("todo")).toEqual([]);
    expect(titles("done")).toEqual(["A", "X", "B"]);
    expect(getTask(a.id, db)!.status).toBe("done");
  });
});

describe("listTasks filters", () => {
  beforeEach(() => {
    seed(db);
  });

  it("returns every seeded task without filters", () => {
    expect(listTasks({}, db)).toHaveLength(12);
  });

  it("searches the title, ignoring case", () => {
    expect(listTasks({ q: "safari" }, db).map((t) => t.title)).toEqual(["Login page crashes on Safari 17"]);
  });

  it("filters by priority", () => {
    const urgent = listTasks({ priority: "urgent" }, db);
    expect(urgent.length).toBeGreaterThan(0);
    expect(urgent.every((t) => t.priority === "urgent")).toBe(true);
  });

  it("filters by label and keeps all the task's labels", () => {
    const bug = listLabels(db).find((l) => l.name === "Bug")!;
    const bugs = listTasks({ labelId: bug.id }, db);
    expect(bugs.length).toBe(3);
    expect(bugs.every((t) => t.labels.some((l) => l.id === bug.id))).toBe(true);
    expect(bugs.some((t) => t.labels.length > 1)).toBe(true);
  });

  it("combines filters", () => {
    const bug = listLabels(db).find((l) => l.name === "Bug")!;
    expect(listTasks({ labelId: bug.id, priority: "high", q: "search" }, db)).toHaveLength(1);
  });
});

describe("deleteTask", () => {
  it("removes the task and its label links", () => {
    seed(db);
    const task = listTasks({}, db).find((t) => t.labels.length > 0)!;
    deleteTask(task.id, db);
    expect(getTask(task.id, db)).toBeNull();
    expect(listTasks({}, db)).toHaveLength(11);
    expect(listLabels(db)).toHaveLength(6);
  });
});
