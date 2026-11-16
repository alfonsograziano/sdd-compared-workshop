import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { describeActivity, listActivity } from "@/lib/activity";
import { createDb, type Db } from "@/lib/db";
import { labels, taskActivity } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/errors";
import { createTask, moveTask, updateTask } from "@/lib/tasks";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

function addLabels(...names: string[]) {
  return db
    .insert(labels)
    .values(names.map((name) => ({ name, color: "#000" })))
    .returning()
    .all();
}

/** Entries after the "created" one, as sentences. */
function changes(taskId: number) {
  return listActivity(taskId, db)
    .filter((a) => a.field !== null)
    .map(describeActivity);
}

describe("describeActivity", () => {
  it("words every kind of entry", () => {
    const cases: [Parameters<typeof describeActivity>[0], string][] = [
      [{ field: null, oldValue: null, newValue: null }, "created the task"],
      [{ field: "title", oldValue: "Old", newValue: "New" }, "changed the title from Old to New"],
      [{ field: "description", oldValue: "a", newValue: "b" }, "changed the description"],
      [{ field: "status", oldValue: "todo", newValue: "in_progress" }, "changed status from Todo to In Progress"],
      [{ field: "priority", oldValue: "medium", newValue: "urgent" }, "changed priority from Medium to Urgent"],
      [{ field: "labels", oldValue: '["Bug"]', newValue: '["Bug","Docs"]' }, "changed labels from Bug to Bug, Docs"],
      [{ field: "labels", oldValue: "[]", newValue: '["Bug"]' }, "changed labels from none to Bug"],
      [{ field: "dueDate", oldValue: null, newValue: "2026-09-24" }, "changed due date from none to Sep 24"],
      [{ field: "dueDate", oldValue: "2026-09-24", newValue: null }, "changed due date from Sep 24 to none"],
    ];
    for (const [entry, sentence] of cases) {
      expect(describeActivity(entry)).toBe(sentence);
    }
  });
});

describe("createTask activity", () => {
  it("records one created entry at the task's creation time", () => {
    const task = createTask({ title: "x", priority: "high", dueDate: "2026-01-01" }, db);
    const entries = listActivity(task.id, db);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ field: null, oldValue: null, newValue: null });
    expect(entries[0].createdAt.getTime()).toBe(task.createdAt.getTime());
  });
});

describe("updateTask activity", () => {
  it("records one entry per changed field", () => {
    const task = createTask({ title: "x", priority: "medium" }, db);
    updateTask(task.id, { priority: "urgent", dueDate: "2026-09-24" }, db);
    expect(changes(task.id)).toEqual([
      "changed priority from Medium to Urgent",
      "changed due date from none to Sep 24",
    ]);
  });

  it("records nothing when every value is unchanged", () => {
    const [bug, docs] = addLabels("Bug", "Docs");
    const task = createTask(
      { title: "Same", description: "d", status: "todo", priority: "low", dueDate: "2026-01-02", labelIds: [bug.id, docs.id] },
      db,
    );
    updateTask(
      task.id,
      // Title is compared after trimming; label order does not matter.
      { title: "  Same  ", description: "d", status: "todo", priority: "low", dueDate: "2026-01-02", labelIds: [docs.id, bug.id] },
      db,
    );
    expect(changes(task.id)).toEqual([]);
  });

  it("words and stores each field change", () => {
    const task = createTask({ title: "Old", description: "before" }, db);
    updateTask(task.id, { title: " New " }, db);
    updateTask(task.id, { description: "after" }, db);
    updateTask(task.id, { status: "done" }, db);
    updateTask(task.id, { dueDate: "2026-09-24" }, db);
    updateTask(task.id, { dueDate: null }, db);
    expect(changes(task.id)).toEqual([
      "changed the title from Old to New",
      "changed the description",
      "changed status from Backlog to Done",
      "changed due date from none to Sep 24",
      "changed due date from Sep 24 to none",
    ]);

    const stored = listActivity(task.id, db).filter((a) => a.field !== null);
    expect(stored.map((a) => [a.field, a.oldValue, a.newValue])).toEqual([
      ["title", "Old", "New"],
      ["description", "before", "after"],
      ["status", "backlog", "done"],
      ["dueDate", null, "2026-09-24"],
      ["dueDate", "2026-09-24", null],
    ]);
  });

  it("records labels by sorted name, one entry per save", () => {
    const [bug, docs, api] = addLabels("Bug", "Docs", "API");
    const task = createTask({ title: "x", labelIds: [bug.id] }, db);
    updateTask(task.id, { labelIds: [docs.id, bug.id] }, db);
    updateTask(task.id, { labelIds: [api.id, docs.id, bug.id] }, db);
    updateTask(task.id, { labelIds: [] }, db);
    expect(changes(task.id)).toEqual([
      "changed labels from Bug to Bug, Docs",
      "changed labels from Bug, Docs to API, Bug, Docs",
      "changed labels from API, Bug, Docs to none",
    ]);
    const first = listActivity(task.id, db).find((a) => a.field === "labels")!;
    expect(first).toMatchObject({ oldValue: '["Bug"]', newValue: '["Bug","Docs"]' });
  });

  it("keeps old label names after a label is renamed or deleted", () => {
    const [bug] = addLabels("Bug");
    const task = createTask({ title: "x" }, db);
    updateTask(task.id, { labelIds: [bug.id] }, db);
    db.update(labels).set({ name: "Defect" }).where(eq(labels.id, bug.id)).run();
    expect(changes(task.id)).toEqual(["changed labels from none to Bug"]);
    db.delete(labels).where(eq(labels.id, bug.id)).run();
    expect(changes(task.id)).toEqual(["changed labels from none to Bug"]);
  });

  it("writes nothing when the save fails", () => {
    const task = createTask({ title: "x" }, db);
    expect(() => updateTask(task.id, { title: "  " }, db)).toThrow();
    expect(() => updateTask(task.id, { priority: "high", labelIds: [999] }, db)).toThrow();
    expect(changes(task.id)).toEqual([]);
  });

  it("throws NotFoundError for a missing task", () => {
    expect(() => updateTask(999, { title: "x" }, db)).toThrow(NotFoundError);
  });
});

describe("moveTask activity", () => {
  it("records a status change when the task moves to another column", () => {
    const task = createTask({ title: "x", status: "todo" }, db);
    moveTask(task.id, { status: "in_progress", beforeId: null }, db);
    expect(changes(task.id)).toEqual(["changed status from Todo to In Progress"]);
  });

  it("records nothing for a reorder inside the same column", () => {
    const a = createTask({ title: "A", status: "todo" }, db);
    const b = createTask({ title: "B", status: "todo" }, db);
    moveTask(b.id, { status: "todo", beforeId: a.id }, db);
    expect(changes(a.id)).toEqual([]);
    expect(changes(b.id)).toEqual([]);
  });

  it("throws NotFoundError for a missing task", () => {
    expect(() => moveTask(999, { status: "todo", beforeId: null }, db)).toThrow(NotFoundError);
  });
});

describe("activity table", () => {
  it("only holds rows written by task changes", () => {
    const task = createTask({ title: "x" }, db);
    updateTask(task.id, { priority: "low" }, db);
    expect(db.select().from(taskActivity).all()).toHaveLength(2);
  });
});
