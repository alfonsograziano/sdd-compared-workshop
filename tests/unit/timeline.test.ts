import { describe, expect, it } from "vitest";
import type { Activity, Comment } from "@/lib/db/schema";
import { mergeTimeline } from "@/lib/timeline";

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
