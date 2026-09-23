import { beforeEach, describe, expect, it } from "vitest";
import { countComments, createComment, deleteComment, listComments, updateComment } from "@/lib/comments";
import { createDb, type Db } from "@/lib/db";
import { createTask, getTask, listTasks } from "@/lib/tasks";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

const wait = () => new Promise((r) => setTimeout(r, 5));

describe("createComment", () => {
  it("trims the body and starts unedited", () => {
    const task = createTask({ title: "x" }, db);
    const comment = createComment(task.id, "  Needs **review**  \n", db);
    expect(comment).toMatchObject({ taskId: task.id, body: "Needs **review**", updatedAt: null });
    expect(comment.createdAt).toBeInstanceOf(Date);
  });

  it("rejects an empty or whitespace-only body", () => {
    const task = createTask({ title: "x" }, db);
    expect(() => createComment(task.id, "", db)).toThrow(/cannot be empty/);
    expect(() => createComment(task.id, "   \n\t", db)).toThrow(/cannot be empty/);
    expect(listComments(task.id, db)).toEqual([]);
  });

  it("accepts 10,000 characters and rejects more", () => {
    const task = createTask({ title: "x" }, db);
    expect(createComment(task.id, "a".repeat(10_000), db).body).toHaveLength(10_000);
    expect(() => createComment(task.id, "a".repeat(10_001), db)).toThrow(/too long/);
  });

  it("throws for a missing task", () => {
    expect(() => createComment(999, "hello", db)).toThrow(/Task 999 not found/);
  });
});

describe("listComments", () => {
  it("returns only the task's comments, oldest first", async () => {
    const a = createTask({ title: "A" }, db);
    const b = createTask({ title: "B" }, db);
    createComment(a.id, "first", db);
    await wait();
    createComment(b.id, "other task", db);
    createComment(a.id, "second", db);
    expect(listComments(a.id, db).map((c) => c.body)).toEqual(["first", "second"]);
    expect(listComments(b.id, db).map((c) => c.body)).toEqual(["other task"]);
  });
});

describe("updateComment", () => {
  it("changes the body, sets updatedAt and keeps createdAt", async () => {
    const task = createTask({ title: "x" }, db);
    const comment = createComment(task.id, "old", db);
    await wait();
    const updated = updateComment(comment.id, " new ", db);
    expect(updated.body).toBe("new");
    expect(updated.createdAt.getTime()).toBe(comment.createdAt.getTime());
    expect(updated.updatedAt).toBeInstanceOf(Date);
    expect(updated.updatedAt!.getTime()).toBeGreaterThan(comment.createdAt.getTime());
  });

  it("does not mark the comment edited when the text is the same", () => {
    const task = createTask({ title: "x" }, db);
    const comment = createComment(task.id, "same", db);
    expect(updateComment(comment.id, "  same ", db).updatedAt).toBeNull();
  });

  it("validates the new body", () => {
    const task = createTask({ title: "x" }, db);
    const comment = createComment(task.id, "keep me", db);
    expect(() => updateComment(comment.id, "  ", db)).toThrow(/cannot be empty/);
    expect(listComments(task.id, db)[0].body).toBe("keep me");
  });

  it("throws for a missing comment", () => {
    expect(() => updateComment(999, "x", db)).toThrow(/Comment 999 not found/);
  });
});

describe("deleteComment", () => {
  it("removes only that comment", () => {
    const task = createTask({ title: "x" }, db);
    const a = createComment(task.id, "a", db);
    createComment(task.id, "b", db);
    deleteComment(a.id, db);
    expect(listComments(task.id, db).map((c) => c.body)).toEqual(["b"]);
  });

  it("does nothing for a missing comment", () => {
    expect(() => deleteComment(999, db)).not.toThrow();
  });
});

describe("comment counts", () => {
  it("counts comments per task in one call", () => {
    const a = createTask({ title: "A" }, db);
    const b = createTask({ title: "B" }, db);
    const c = createTask({ title: "C" }, db);
    createComment(a.id, "1", db);
    createComment(a.id, "2", db);
    createComment(b.id, "3", db);
    const counts = countComments([a.id, b.id, c.id], db);
    expect(counts.get(a.id)).toBe(2);
    expect(counts.get(b.id)).toBe(1);
    expect(counts.get(c.id)).toBeUndefined();
    expect(countComments([], db).size).toBe(0);
  });

  it("puts commentCount on listTasks and getTask, and follows creates and deletes", () => {
    const task = createTask({ title: "x" }, db);
    expect(task.commentCount).toBe(0);
    const first = createComment(task.id, "one", db);
    createComment(task.id, "two", db);
    expect(getTask(task.id, db)!.commentCount).toBe(2);
    expect(listTasks({}, db).find((t) => t.id === task.id)!.commentCount).toBe(2);
    deleteComment(first.id, db);
    expect(getTask(task.id, db)!.commentCount).toBe(1);
  });
});
