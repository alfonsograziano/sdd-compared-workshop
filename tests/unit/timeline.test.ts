import { describe, expect, it } from "vitest";
import { createComment } from "@/lib/comments";
import { createDb } from "@/lib/db";
import type { Activity, Comment } from "@/lib/db/schema";
import { createTask, updateTask } from "@/lib/tasks";
import { getTimeline, mergeTimeline, toTimelineEntries, type TimelineItem } from "@/lib/timeline";

const at = (ms: number) => new Date(ms);

function comment(id: number, ms: number): Comment {
  return { id, taskId: 1, body: `comment ${id}`, createdAt: at(ms), updatedAt: null };
}

function activity(id: number, ms: number): Activity {
  return { id, taskId: 1, field: "priority", oldValue: "low", newValue: "high", createdAt: at(ms) };
}

describe("mergeTimeline", () => {
  it("mixes comments and activity, oldest first", () => {
    const items = mergeTimeline([comment(1, 300), comment(2, 100)], [activity(1, 200), activity(2, 400)]);
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(["comment:2", "activity:1", "comment:1", "activity:2"]);
  });

  it("puts activity before a comment made at the same time, then orders by id", () => {
    const items = mergeTimeline([comment(5, 100), comment(4, 100)], [activity(9, 100)]);
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(["activity:9", "comment:4", "comment:5"]);
  });

  it("carries the fields each entry needs", () => {
    const [c, a] = mergeTimeline([comment(1, 200)], [activity(1, 100)]).reverse();
    expect(c).toMatchObject({ kind: "comment", body: "comment 1", editedAt: null });
    expect(a).toMatchObject({ kind: "activity", field: "priority", oldValue: "low", newValue: "high" });
  });

  it("returns an empty list when there is nothing", () => {
    expect(mergeTimeline([], [])).toEqual([]);
  });
});

const wait = () => new Promise((r) => setTimeout(r, 5));

describe("getTimeline", () => {
  it("returns the task's comments and activity merged oldest first, and nothing from other tasks", async () => {
    const db = createDb(":memory:");
    const task = createTask({ title: "Mine", priority: "medium" }, db);
    const other = createTask({ title: "Other" }, db);
    await wait();
    createComment(task.id, "first comment", db);
    createComment(other.id, "not mine", db);
    await wait();
    updateTask(task.id, { priority: "urgent" }, db);
    updateTask(other.id, { priority: "low" }, db);
    await wait();
    createComment(task.id, "second comment", db);

    const items = getTimeline(task.id, db);
    expect(
      items.map((i) => (i.kind === "comment" ? `comment:${i.body}` : `activity:${i.field ?? "created"}`)),
    ).toEqual(["activity:created", "comment:first comment", "activity:priority", "comment:second comment"]);
    expect(items.every((i, n) => n === 0 || items[n - 1].at.getTime() <= i.at.getTime())).toBe(true);
    expect(items[2]).toMatchObject({ kind: "activity", oldValue: "medium", newValue: "urgent" });
  });

  it("returns an empty list for a task id with no rows", () => {
    expect(getTimeline(999, createDb(":memory:"))).toEqual([]);
  });
});

describe("toTimelineEntries", () => {
  const written = new Date("2026-09-24T08:05:30.123Z");
  const edited = new Date("2026-09-25T17:42:00.000Z");

  it("formats comment times, with editedAt null when unedited and formatted when edited", () => {
    const items: TimelineItem[] = [
      { kind: "comment", id: 1, at: written, body: "plain", editedAt: null },
      { kind: "comment", id: 2, at: written, body: "changed", editedAt: edited },
    ];
    expect(toTimelineEntries(items)).toEqual([
      { kind: "comment", id: 1, at: "2026-09-24 08:05 UTC", body: "plain", editedAt: null },
      { kind: "comment", id: 2, at: "2026-09-24 08:05 UTC", body: "changed", editedAt: "2026-09-25 17:42 UTC" },
    ]);
  });

  it("turns activity into a sentence, with no details for fields other than the description", () => {
    const [entry] = toTimelineEntries([
      { kind: "activity", id: 7, at: written, field: "priority", oldValue: "medium", newValue: "urgent" },
    ]);
    expect(entry).toEqual({
      kind: "activity",
      id: 7,
      at: "2026-09-24 08:05 UTC",
      text: "changed priority from Medium to Urgent",
    });
    expect(entry).not.toHaveProperty("details");
  });

  it("describes task creation", () => {
    const [entry] = toTimelineEntries([
      { kind: "activity", id: 1, at: written, field: null, oldValue: null, newValue: null },
    ]);
    expect(entry).toMatchObject({ kind: "activity", text: "created the task" });
  });

  it("carries before and after details for a description change", () => {
    const [entry] = toTimelineEntries([
      { kind: "activity", id: 3, at: edited, field: "description", oldValue: "old text", newValue: "new text" },
    ]);
    expect(entry).toEqual({
      kind: "activity",
      id: 3,
      at: "2026-09-25 17:42 UTC",
      text: "changed the description",
      details: { before: "old text", after: "new text" },
    });
  });

  it("keeps the order it is given", () => {
    const entries = toTimelineEntries([
      { kind: "comment", id: 4, at: edited, body: "later", editedAt: null },
      { kind: "activity", id: 1, at: written, field: null, oldValue: null, newValue: null },
    ]);
    expect(entries.map((e) => `${e.kind}:${e.id}`)).toEqual(["comment:4", "activity:1"]);
  });
});
