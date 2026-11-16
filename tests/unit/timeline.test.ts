import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createComment, updateComment } from "@/lib/comments";
import { createDb, type Db } from "@/lib/db";
import { createTask, moveTask, updateTask } from "@/lib/tasks";
import { getTimeline, type TimelineEntry } from "@/lib/timeline";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

afterEach(() => {
  vi.useRealTimers();
});

function summary(entries: TimelineEntry[]) {
  return entries.map((e) => (e.kind === "activity" ? e.text : `comment: ${e.body}${e.editedAt ? " (edited)" : ""}`));
}

describe("getTimeline", () => {
  it("interleaves comments and activity by time, oldest first", () => {
    const task = createTask({ title: "x", status: "todo", priority: "medium" }, db);
    // Step the clock so every change gets its own time.
    const start = task.createdAt.getTime();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(start + 1_000);
    updateTask(task.id, { priority: "urgent" }, db);
    vi.setSystemTime(start + 2_000);
    const comment = createComment(task.id, { body: "first" }, db);
    vi.setSystemTime(start + 3_000);
    moveTask(task.id, { status: "in_progress", beforeId: null }, db);
    vi.setSystemTime(start + 4_000);
    // An edit keeps the comment where it was written.
    updateComment(comment.id, { body: "first, edited" }, db);
    vi.setSystemTime(start + 5_000);
    createComment(task.id, { body: "second" }, db);

    expect(summary(getTimeline(task.id, db))).toEqual([
      "created the task",
      "changed priority from Medium to Urgent",
      "comment: first, edited (edited)",
      "changed status from Todo to In Progress",
      "comment: second",
    ]);
  });

  it("orders entries with the same time stably: activity first, then by id", () => {
    const task = createTask({ title: "x" }, db);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(task.createdAt.getTime() + 1_000);
    createComment(task.id, { body: "b" }, db);
    createComment(task.id, { body: "a" }, db);
    updateTask(task.id, { priority: "low", title: "y" }, db);

    const timeline = summary(getTimeline(task.id, db));
    expect(timeline).toEqual([
      "created the task",
      "changed the title from “x” to “y”",
      "changed priority from No priority to Low",
      "comment: b",
      "comment: a",
    ]);
    expect(summary(getTimeline(task.id, db))).toEqual(timeline);
  });

  it("is empty for a missing task", () => {
    expect(getTimeline(999, db)).toEqual([]);
  });
});
