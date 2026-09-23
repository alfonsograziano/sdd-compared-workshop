import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/lib/db";
import { comments, labels, taskActivity } from "@/lib/db/schema";
import { seed } from "@/lib/seed";
import {
  addComment,
  createTask,
  deleteComment,
  deleteTask,
  getTask,
  getTimeline,
  listTasks,
  moveTask,
  updateComment,
  updateTask,
} from "@/lib/tasks";
import { commentBodySchema } from "@/lib/validation";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

const tick = () => new Promise((r) => setTimeout(r, 5));

/** The activity entries of a task, oldest first, as [field, from, to]. */
function activity(taskId: number) {
  return getTimeline(taskId, db)
    .filter((e) => e.kind === "activity")
    .map((e) => [e.field, e.fromValue, e.toValue]);
}

function addLabels(...names: string[]) {
  return db
    .insert(labels)
    .values(names.map((name) => ({ name, color: "#000" })))
    .returning()
    .all();
}

describe("commentBodySchema", () => {
  it("trims the body and rejects empty or whitespace-only bodies", () => {
    expect(commentBodySchema.parse("  hi  ")).toBe("hi");
    expect(() => commentBodySchema.parse("")).toThrow();
    expect(() => commentBodySchema.parse("   \n ")).toThrow();
    expect(() => commentBodySchema.parse("x".repeat(20_001))).toThrow();
  });
});

describe("comments", () => {
  it("adds a comment with a creation time and no edited marker", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "Looks good, **ship it**", db);
    expect(comment).toMatchObject({ taskId: task.id, body: "Looks good, **ship it**", editedAt: null });
    expect(comment.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty comment and a comment on a missing task", () => {
    const task = createTask({ title: "x" }, db);
    expect(() => addComment(task.id, "  ", db)).toThrow();
    expect(() => addComment(999, "hello", db)).toThrow(/not found/);
    expect(db.select().from(comments).all()).toHaveLength(0);
  });

  it("edits a comment, keeps its creation time and marks it edited", async () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "typo heer", db);
    await tick();
    const edited = updateComment(comment.id, "typo here", db);
    expect(edited.body).toBe("typo here");
    expect(edited.createdAt).toEqual(comment.createdAt);
    expect(edited.editedAt).toBeInstanceOf(Date);
  });

  it("does not mark a comment edited when the body is the same", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "same", db);
    expect(updateComment(comment.id, "  same ", db).editedAt).toBeNull();
  });

  it("rejects an empty edit and keeps the old body", () => {
    const task = createTask({ title: "x" }, db);
    const comment = addComment(task.id, "keep me", db);
    expect(() => updateComment(comment.id, "", db)).toThrow();
    expect(db.select().from(comments).where(eq(comments.id, comment.id)).get()!.body).toBe("keep me");
    expect(() => updateComment(999, "x", db)).toThrow(/not found/);
  });

  it("deletes a comment and updates the count", () => {
    const task = createTask({ title: "x" }, db);
    const a = addComment(task.id, "a", db);
    addComment(task.id, "b", db);
    expect(deleteComment(a.id, db)).toBe(task.id);
    expect(getTask(task.id, db)!.commentCount).toBe(1);
    expect(deleteComment(a.id, db)).toBeNull();
  });

  it("counts comments per task in listTasks and getTask", () => {
    const none = createTask({ title: "none" }, db);
    const one = createTask({ title: "one" }, db);
    const three = createTask({ title: "three" }, db);
    addComment(one.id, "1", db);
    for (const body of ["1", "2", "3"]) addComment(three.id, body, db);
    const counts = Object.fromEntries(listTasks({}, db).map((t) => [t.title, t.commentCount]));
    expect(counts).toEqual({ none: 0, one: 1, three: 3 });
    expect(getTask(three.id, db)!.commentCount).toBe(3);
    expect(getTask(none.id, db)!.commentCount).toBe(0);
  });

  it("does not record activity for comments", () => {
    const task = createTask({ title: "x" }, db);
    const c = addComment(task.id, "a", db);
    updateComment(c.id, "b", db);
    deleteComment(c.id, db);
    expect(activity(task.id)).toEqual([["created", null, null]]);
  });
});

describe("activity", () => {
  it("records one created entry for a new task", () => {
    const task = createTask({ title: "x", priority: "high", labelIds: addLabels("Bug").map((l) => l.id) }, db);
    expect(activity(task.id)).toEqual([["created", null, null]]);
  });

  it("records a title change", () => {
    const task = createTask({ title: "Old" }, db);
    updateTask(task.id, { title: "New" }, db);
    expect(activity(task.id).at(-1)).toEqual(["title", "Old", "New"]);
  });

  it("records a description change", () => {
    const task = createTask({ title: "x", description: "a" }, db);
    updateTask(task.id, { description: "b" }, db);
    expect(activity(task.id).at(-1)).toEqual(["description", "a", "b"]);
  });

  it("records a status change made through the form", () => {
    const task = createTask({ title: "x", status: "todo" }, db);
    updateTask(task.id, { status: "done" }, db);
    expect(activity(task.id).at(-1)).toEqual(["status", "todo", "done"]);
  });

  it("records a priority change", () => {
    const task = createTask({ title: "x", priority: "medium" }, db);
    updateTask(task.id, { priority: "urgent" }, db);
    expect(activity(task.id).at(-1)).toEqual(["priority", "medium", "urgent"]);
  });

  it("records label changes as sorted name lists", () => {
    const [bug, docs] = addLabels("Bug", "Docs");
    const task = createTask({ title: "x", labelIds: [bug.id] }, db);
    updateTask(task.id, { labelIds: [docs.id, bug.id] }, db);
    updateTask(task.id, { labelIds: [] }, db);
    expect(activity(task.id).slice(1)).toEqual([
      ["labels", "Bug", "Bug, Docs"],
      ["labels", "Bug, Docs", null],
    ]);
  });

  it("records setting and clearing a due date", () => {
    const task = createTask({ title: "x" }, db);
    updateTask(task.id, { dueDate: "2026-12-31" }, db);
    updateTask(task.id, { dueDate: null }, db);
    expect(activity(task.id).slice(1)).toEqual([
      ["due_date", null, "2026-12-31"],
      ["due_date", "2026-12-31", null],
    ]);
  });

  it("records one entry per changed field in a single update", () => {
    const task = createTask({ title: "Old" }, db);
    updateTask(task.id, { title: "New", dueDate: "2026-10-01" }, db);
    expect(activity(task.id).slice(1)).toEqual([
      ["title", "Old", "New"],
      ["due_date", null, "2026-10-01"],
    ]);
  });

  it("records nothing when a value is saved again unchanged", () => {
    const [bug] = addLabels("Bug");
    const task = createTask({ title: "x", priority: "low", status: "todo", labelIds: [bug.id], dueDate: "2026-01-01" }, db);
    updateTask(task.id, { title: "x", priority: "low", status: "todo", labelIds: [bug.id], dueDate: "2026-01-01" }, db);
    expect(activity(task.id)).toEqual([["created", null, null]]);
  });

  it("records a status entry when a card moves to another column", () => {
    const a = createTask({ title: "A", status: "todo" }, db);
    const b = createTask({ title: "B", status: "in_progress" }, db);
    moveTask(a.id, { status: "in_progress", beforeId: b.id }, db);
    expect(activity(a.id).at(-1)).toEqual(["status", "todo", "in_progress"]);
    // The card that was renumbered in the target column gets no entry.
    expect(activity(b.id)).toEqual([["created", null, null]]);
  });

  it("records nothing when a card is reordered inside its column", () => {
    const a = createTask({ title: "A", status: "todo" }, db);
    const b = createTask({ title: "B", status: "todo" }, db);
    moveTask(b.id, { status: "todo", beforeId: a.id }, db);
    expect(activity(a.id)).toHaveLength(1);
    expect(activity(b.id)).toHaveLength(1);
  });

  it("keeps label names in old entries after the label is deleted", () => {
    const [bug] = addLabels("Bug");
    const task = createTask({ title: "x" }, db);
    updateTask(task.id, { labelIds: [bug.id] }, db);
    db.delete(labels).where(eq(labels.id, bug.id)).run();
    expect(activity(task.id).at(-1)).toEqual(["labels", null, "Bug"]);
  });

  it("does not record anything when the update fails", () => {
    const task = createTask({ title: "x" }, db);
    expect(() => updateTask(task.id, { title: "" }, db)).toThrow();
    expect(activity(task.id)).toHaveLength(1);
  });
});

describe("timeline", () => {
  it("mixes activity and comments oldest first", async () => {
    const task = createTask({ title: "x", priority: "medium" }, db);
    await tick();
    addComment(task.id, "first comment", db);
    await tick();
    updateTask(task.id, { priority: "urgent" }, db);
    const kinds = getTimeline(task.id, db).map((e) => (e.kind === "comment" ? e.body : e.field));
    expect(kinds).toEqual(["created", "first comment", "priority"]);
  });

  it("keeps an edited comment at the time it was written", async () => {
    const task = createTask({ title: "x" }, db);
    await tick();
    const old = addComment(task.id, "old", db);
    await tick();
    updateTask(task.id, { title: "y" }, db);
    await tick();
    updateComment(old.id, "old, edited", db);
    const order = getTimeline(task.id, db).map((e) => (e.kind === "comment" ? e.body : e.field));
    expect(order).toEqual(["created", "old, edited", "title"]);
  });
});

describe("deleting a task", () => {
  it("deletes its comments and activity", () => {
    const task = createTask({ title: "x" }, db);
    const other = createTask({ title: "other" }, db);
    addComment(task.id, "a", db);
    addComment(other.id, "b", db);
    updateTask(task.id, { priority: "high" }, db);
    deleteTask(task.id, db);
    expect(db.select().from(comments).where(eq(comments.taskId, task.id)).all()).toHaveLength(0);
    expect(db.select().from(taskActivity).where(eq(taskActivity.taskId, task.id)).all()).toHaveLength(0);
    expect(getTimeline(other.id, db)).toHaveLength(2);
  });
});

describe("seed", () => {
  it("resets comments and activity and gives every task a created entry", () => {
    seed(db);
    const first = listTasks({}, db)[0];
    addComment(first.id, "will be wiped", db);
    seed(db);
    expect(db.select().from(comments).all()).toHaveLength(0);
    const entries = db.select().from(taskActivity).all();
    expect(entries).toHaveLength(12);
    expect(entries.every((e) => e.field === "created")).toBe(true);
  });
});
