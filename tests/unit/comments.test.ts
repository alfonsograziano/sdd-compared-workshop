import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { listActivity } from "@/lib/activity";
import { countComments, createComment, deleteComment, listComments, updateComment } from "@/lib/comments";
import { createDb, type Db } from "@/lib/db";
import { comments, taskActivity } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "@/lib/tasks";

let db: Db;
let taskId: number;

beforeEach(() => {
  db = createDb(":memory:");
  taskId = createTask({ title: "Task" }, db).id;
});

describe("createComment", () => {
  it("saves a markdown body with the time it was written", () => {
    const comment = createComment(taskId, { body: "**hi**" }, db);
    expect(comment).toMatchObject({ taskId, body: "**hi**", editedAt: null });
    expect(comment.createdAt).toBeInstanceOf(Date);
    expect(listComments(taskId, db).map((c) => c.body)).toEqual(["**hi**"]);
  });

  it("trims the body", () => {
    expect(createComment(taskId, { body: "  hello \n" }, db).body).toBe("hello");
  });

  it("rejects an empty body and saves nothing", () => {
    expect(() => createComment(taskId, { body: "   " }, db)).toThrow(ZodError);
    expect(listComments(taskId, db)).toEqual([]);
  });

  it("accepts up to 20,000 characters", () => {
    expect(createComment(taskId, { body: "a".repeat(20_000) }, db).body).toHaveLength(20_000);
    expect(() => createComment(taskId, { body: "a".repeat(20_001) }, db)).toThrow(ZodError);
  });

  it("throws NotFoundError for a missing task", () => {
    expect(() => createComment(999, { body: "x" }, db)).toThrow(NotFoundError);
  });

  it("records no activity", () => {
    const comment = createComment(taskId, { body: "a" }, db);
    updateComment(comment.id, { body: "b" }, db);
    deleteComment(comment.id, db);
    expect(listActivity(taskId, db).map((a) => a.field)).toEqual([null]);
  });
});

describe("updateComment", () => {
  it("saves a changed body and marks the comment as edited", () => {
    const comment = createComment(taskId, { body: "a" }, db);
    const updated = updateComment(comment.id, { body: "b" }, db);
    expect(updated.body).toBe("b");
    expect(updated.editedAt).toBeInstanceOf(Date);
    expect(updated.createdAt.getTime()).toBe(comment.createdAt.getTime());
  });

  it("does not mark the comment when the trimmed body is the same", () => {
    const comment = createComment(taskId, { body: "a" }, db);
    const updated = updateComment(comment.id, { body: " a " }, db);
    expect(updated).toMatchObject({ body: "a", editedAt: null });
  });

  it("rejects an empty body", () => {
    const comment = createComment(taskId, { body: "a" }, db);
    expect(() => updateComment(comment.id, { body: "" }, db)).toThrow(ZodError);
    expect(listComments(taskId, db)[0]).toMatchObject({ body: "a", editedAt: null });
  });

  it("throws NotFoundError for a missing comment", () => {
    expect(() => updateComment(999, { body: "x" }, db)).toThrow(NotFoundError);
  });
});

describe("deleteComment", () => {
  it("removes the comment", () => {
    const keep = createComment(taskId, { body: "keep" }, db);
    const gone = createComment(taskId, { body: "gone" }, db);
    deleteComment(gone.id, db);
    expect(listComments(taskId, db).map((c) => c.id)).toEqual([keep.id]);
  });

  it("throws NotFoundError for a missing comment", () => {
    expect(() => deleteComment(999, db)).toThrow(NotFoundError);
  });
});

describe("comment counts", () => {
  it("counts comments per task and leaves out tasks without any", () => {
    const other = createTask({ title: "Other" }, db).id;
    createComment(taskId, { body: "1" }, db);
    createComment(taskId, { body: "2" }, db);
    expect(countComments([taskId, other], db)).toEqual(new Map([[taskId, 2]]));
    expect(countComments([], db)).toEqual(new Map());
  });

  it("is attached to tasks as commentCount", () => {
    const other = createTask({ title: "Other" }, db).id;
    createComment(taskId, { body: "1" }, db);
    expect(getTask(taskId, db)!.commentCount).toBe(1);
    expect(getTask(other, db)!.commentCount).toBe(0);
    expect(listTasks({}, db).map((t) => [t.title, t.commentCount])).toEqual([
      ["Task", 1],
      ["Other", 0],
    ]);
    expect(updateTask(taskId, { title: "Renamed" }, db).commentCount).toBe(1);
  });
});

describe("deleteTask", () => {
  it("deletes the task's comments and activity", () => {
    const other = createTask({ title: "Other" }, db).id;
    createComment(taskId, { body: "a" }, db);
    createComment(other, { body: "b" }, db);
    updateTask(taskId, { priority: "high" }, db);

    deleteTask(taskId, db);

    expect(db.select().from(comments).where(eq(comments.taskId, taskId)).all()).toEqual([]);
    expect(db.select().from(taskActivity).where(eq(taskActivity.taskId, taskId)).all()).toEqual([]);
    // The other task keeps its rows.
    expect(listComments(other, db)).toHaveLength(1);
    expect(listActivity(other, db)).toHaveLength(1);
  });
});
