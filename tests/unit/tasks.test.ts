import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/lib/db";
import { activities, comments, labels } from "@/lib/db/schema";
import { seed } from "@/lib/seed";
import {
  addComment,
  createTask,
  deleteComment,
  deleteTask,
  getTask,
  getTimeline,
  listLabels,
  listTasks,
  moveTask,
  NotFoundError,
  updateComment,
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
    expect(() => updateTask(999, { title: "x" }, db)).toThrow(NotFoundError);
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

describe("moveTask missing id", () => {
  it("throws NotFoundError", () => {
    expect(() => moveTask(999, { status: "todo", beforeId: null }, db)).toThrow(NotFoundError);
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

/** The activity entries of a task as [field, from, to], oldest first. */
function changes(taskId: number) {
  return getTimeline(taskId, db)
    .filter((e) => e.kind === "activity")
    .map((e) => [e.field, e.fromValue, e.toValue]);
}

describe("activity log", () => {
  it("records one created entry for a new task", () => {
    const task = createTask({ title: "x" }, db);
    expect(changes(task.id)).toEqual([["created", null, null]]);
    expect(getTimeline(task.id, db)[0].createdAt.getTime()).toBe(task.createdAt.getTime());
  });

  it("records every changed field with raw from and to values", () => {
    const [bug, docs] = db
      .insert(labels)
      .values([
        { name: "Bug", color: "#f00" },
        { name: "Docs", color: "#ff0" },
      ])
      .returning()
      .all();
    const task = createTask({ title: "Old", priority: "medium", dueDate: "2026-09-24", labelIds: [bug.id] }, db);
    updateTask(task.id, { priority: "urgent" }, db);
    updateTask(task.id, { title: "New", description: "Some text", status: "todo" }, db);
    updateTask(task.id, { labelIds: [docs.id, bug.id] }, db);
    updateTask(task.id, { dueDate: null }, db);
    expect(changes(task.id)).toEqual([
      ["created", null, null],
      ["priority", "medium", "urgent"],
      ["title", "Old", "New"],
      ["description", "", "Some text"],
      ["status", "backlog", "todo"],
      ["labels", "Bug", "Bug, Docs"],
      ["dueDate", "2026-09-24", null],
    ]);
  });

  it("records nothing for a save that changes nothing", async () => {
    const [bug, docs] = db
      .insert(labels)
      .values([
        { name: "Bug", color: "#f00" },
        { name: "Docs", color: "#ff0" },
      ])
      .returning()
      .all();
    const task = createTask({ title: "Same", priority: "low", labelIds: [bug.id, docs.id] }, db);
    await new Promise((r) => setTimeout(r, 5));
    const after = updateTask(
      task.id,
      { title: "  Same  ", priority: "low", dueDate: null, labelIds: [docs.id, bug.id, bug.id] },
      db,
    );
    expect(changes(task.id)).toEqual([["created", null, null]]);
    expect(after.updatedAt.getTime()).toBe(task.updatedAt.getTime());
  });

  it("records labels going to none", () => {
    const [bug] = db.insert(labels).values([{ name: "Bug", color: "#f00" }]).returning().all();
    const task = createTask({ title: "x", labelIds: [bug.id] }, db);
    updateTask(task.id, { labelIds: [] }, db);
    expect(changes(task.id).at(-1)).toEqual(["labels", "Bug", null]);
  });

  it("records a move to another column but not a reorder inside one", () => {
    const a = createTask({ title: "A", status: "todo" }, db);
    const b = createTask({ title: "B", status: "todo" }, db);
    moveTask(b.id, { status: "todo", beforeId: a.id }, db);
    expect(changes(b.id)).toEqual([["created", null, null]]);
    moveTask(b.id, { status: "done", beforeId: null }, db);
    expect(changes(b.id)).toEqual([
      ["created", null, null],
      ["status", "todo", "done"],
    ]);
    // Moving A up changed B's position too, but that is not an activity for either.
    expect(changes(a.id)).toEqual([["created", null, null]]);
  });

  it("does not log comment add, edit or delete as activity", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "hello", db);
    updateComment(comment.id, "hello again", db);
    deleteComment(comment.id, db);
    expect(changes(task.id)).toEqual([["created", null, null]]);
  });
});

describe("comments", () => {
  it("adds a trimmed markdown comment and counts it", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "  Looks **good**  ", db);
    expect(comment).toMatchObject({ taskId: task.id, body: "Looks **good**", editedAt: null });
    expect(comment.createdAt).toBeInstanceOf(Date);
    expect(getTask(task.id, db)!.commentCount).toBe(1);
  });

  it("refuses an empty or too long comment", () => {
    const task = createTask({ title: "x" }, db);
    expect(() => addComment(task.id, "   ", db)).toThrow();
    expect(() => addComment(task.id, "a".repeat(10_001), db)).toThrow();
    expect(() => addComment(task.id, "a".repeat(10_000), db)).not.toThrow();
    expect(db.select().from(comments).all()).toHaveLength(1);
  });

  it("refuses a comment on a missing task", () => {
    expect(() => addComment(999, "hi", db)).toThrow(NotFoundError);
  });

  it("marks a comment edited only when the body changes", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "first", db);
    expect(updateComment(comment.id, " first ", db).editedAt).toBeNull();
    const edited = updateComment(comment.id, "second", db);
    expect(edited.body).toBe("second");
    expect(edited.editedAt).toBeInstanceOf(Date);
  });

  it("refuses to edit an unknown comment or save it empty", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "first", db);
    expect(() => updateComment(999, "x", db)).toThrow(NotFoundError);
    expect(() => updateComment(comment.id, "  ", db)).toThrow();
    expect(getTimeline(task.id, db).find((e) => e.kind === "comment")).toMatchObject({ body: "first" });
  });

  it("deletes a comment", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "bye", db);
    deleteComment(comment.id, db);
    expect(getTask(task.id, db)!.commentCount).toBe(0);
  });

  it("counts comments per task in listTasks", () => {
    const a = createTask({ title: "A" }, db);
    const b = createTask({ title: "B" }, db);
    addComment(a.id, "one", db);
    addComment(a.id, "two", db);
    const counts = Object.fromEntries(listTasks({}, db).map((t) => [t.title, t.commentCount]));
    expect(counts).toEqual({ A: 2, B: 0 });
    expect(b.commentCount).toBe(0);
  });
});

describe("getTimeline", () => {
  it("merges comments and activity, oldest first", async () => {
    const tick = () => new Promise((r) => setTimeout(r, 3));
    const task = createTask({ title: "x", priority: "medium" }, db);
    await tick();
    updateTask(task.id, { priority: "urgent" }, db);
    await tick();
    addComment(task.id, "a comment", db);
    await tick();
    updateTask(task.id, { status: "todo" }, db);
    const timeline = getTimeline(task.id, db);
    expect(timeline.map((e) => (e.kind === "comment" ? `comment:${e.body}` : e.field))).toEqual([
      "created",
      "priority",
      "comment:a comment",
      "status",
    ]);
  });

  it("keeps insert order for entries in the same millisecond", () => {
    const task = createTask({ title: "x" }, db);
    const at = new Date("2026-01-01T00:00:00Z");
    db.insert(activities)
      .values([
        { taskId: task.id, field: "priority", fromValue: "none", toValue: "low", createdAt: at },
        { taskId: task.id, field: "priority", fromValue: "low", toValue: "high", createdAt: at },
      ])
      .run();
    expect(changes(task.id).slice(0, 2)).toEqual([
      ["priority", "none", "low"],
      ["priority", "low", "high"],
    ]);
  });
});

describe("deleteTask with history", () => {
  it("removes the task's comments and activity", () => {
    const task = createTask({ title: "x" }, db);
    const other = createTask({ title: "y" }, db);
    addComment(task.id, "one", db);
    updateTask(task.id, { priority: "high" }, db);
    deleteTask(task.id, db);
    expect(db.select().from(comments).all()).toEqual([]);
    expect(db.select().from(activities).all().map((a) => a.taskId)).toEqual([other.id]);
  });
});

describe("seed", () => {
  it("gives every seeded task a created entry and no comments", () => {
    seed(db);
    const tasks = listTasks({}, db);
    expect(tasks.every((t) => t.commentCount === 0)).toBe(true);
    expect(tasks.every((t) => changes(t.id).length === 1 && changes(t.id)[0][0] === "created")).toBe(true);
  });
});
