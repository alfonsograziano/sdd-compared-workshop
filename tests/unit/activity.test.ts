import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { describeActivity, listActivity } from "@/lib/activity";
import { createDb, type Db } from "@/lib/db";
import { labels } from "@/lib/db/schema";
import { createTask, moveTask, updateTask } from "@/lib/tasks";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

/** The task's activity as [field, old, new] rows, without the "created" entry. */
function changes(taskId: number) {
  return listActivity(taskId, db)
    .filter((a) => a.field !== null)
    .map((a) => [a.field, a.oldValue, a.newValue]);
}

function addLabels(...names: string[]) {
  return db
    .insert(labels)
    .values(names.map((name) => ({ name, color: "#000" })))
    .returning()
    .all();
}

describe("recording activity", () => {
  it("records one 'created' entry when a task is created, and nothing for its starting values", () => {
    const task = createTask({ title: "New", priority: "high", status: "todo", dueDate: "2026-10-01" }, db);
    const activity = listActivity(task.id, db);
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({ taskId: task.id, field: null, oldValue: null, newValue: null });
    expect(activity[0].createdAt).toBeInstanceOf(Date);
  });

  it("records title, description, status and priority changes with old and new values", () => {
    const task = createTask({ title: "Old", description: "a", status: "todo", priority: "medium" }, db);
    updateTask(task.id, { title: "New" }, db);
    updateTask(task.id, { description: "b" }, db);
    updateTask(task.id, { status: "in_progress" }, db);
    updateTask(task.id, { priority: "urgent" }, db);
    expect(changes(task.id)).toEqual([
      ["title", "Old", "New"],
      ["description", "a", "b"],
      ["status", "todo", "in_progress"],
      ["priority", "medium", "urgent"],
    ]);
  });

  it("records setting and clearing the due date", () => {
    const task = createTask({ title: "x" }, db);
    updateTask(task.id, { dueDate: "2026-10-01" }, db);
    updateTask(task.id, { dueDate: null }, db);
    expect(changes(task.id)).toEqual([
      ["due_date", null, "2026-10-01"],
      ["due_date", "2026-10-01", null],
    ]);
  });

  it("records label changes as sorted lists of names", () => {
    const [bug, docs, feature] = addLabels("Bug", "Docs", "Feature");
    const task = createTask({ title: "x", labelIds: [bug.id] }, db);
    updateTask(task.id, { labelIds: [feature.id, docs.id] }, db);
    expect(changes(task.id)).toEqual([["labels", '["Bug"]', '["Docs","Feature"]']]);
  });

  it("records one entry per changed field when a save changes several", () => {
    const task = createTask({ title: "x", priority: "low" }, db);
    updateTask(task.id, { priority: "high", dueDate: "2026-12-31", title: "x" }, db);
    expect(changes(task.id)).toEqual([
      ["priority", "low", "high"],
      ["due_date", null, "2026-12-31"],
    ]);
  });

  it("records nothing when a save changes nothing", () => {
    const [a, b] = addLabels("A", "B");
    const task = createTask({ title: "Same", description: "d", priority: "low", labelIds: [a.id, b.id] }, db);
    updateTask(task.id, { title: " Same ", description: "d", priority: "low", dueDate: null }, db);
    updateTask(task.id, { labelIds: [b.id, a.id] }, db);
    expect(changes(task.id)).toEqual([]);
  });

  it("records a status change when a card moves to another column", () => {
    const task = createTask({ title: "x", status: "todo" }, db);
    moveTask(task.id, { status: "in_progress", beforeId: null }, db);
    expect(changes(task.id)).toEqual([["status", "todo", "in_progress"]]);
  });

  it("records nothing when a card is reordered in its column", () => {
    const a = createTask({ title: "A", status: "todo" }, db);
    const b = createTask({ title: "B", status: "todo" }, db);
    moveTask(b.id, { status: "todo", beforeId: a.id }, db);
    expect(changes(b.id)).toEqual([]);
  });

  it("lists activity oldest first, and only for that task", () => {
    const task = createTask({ title: "x" }, db);
    const other = createTask({ title: "other" }, db);
    updateTask(task.id, { priority: "low" }, db);
    updateTask(other.id, { priority: "high" }, db);
    updateTask(task.id, { priority: "urgent" }, db);
    expect(listActivity(task.id, db).map((a) => a.newValue)).toEqual([null, "low", "urgent"]);
  });

  it("keeps old label names readable after the label is deleted", () => {
    const [bug] = addLabels("Bug");
    const task = createTask({ title: "x", labelIds: [bug.id] }, db);
    updateTask(task.id, { labelIds: [] }, db);
    db.delete(labels).where(eq(labels.id, bug.id)).run();
    const entry = listActivity(task.id, db).at(-1)!;
    expect(describeActivity(entry).text).toBe("removed label Bug");
  });
});

describe("describeActivity", () => {
  const describe_ = (field: Parameters<typeof describeActivity>[0]["field"], oldValue: string | null, newValue: string | null) =>
    describeActivity({ field, oldValue, newValue });

  it("describes task creation", () => {
    expect(describe_(null, null, null)).toEqual({ text: "created the task" });
  });

  it("uses display names for priority and status", () => {
    expect(describe_("priority", "medium", "urgent").text).toBe("changed priority from Medium to Urgent");
    expect(describe_("priority", "none", "low").text).toBe("changed priority from No priority to Low");
    expect(describe_("status", "todo", "in_progress").text).toBe("changed status from Todo to In Progress");
  });

  it("quotes titles", () => {
    expect(describe_("title", "Old", "New").text).toBe('changed title from "Old" to "New"');
  });

  it("formats due dates and says when there is none", () => {
    expect(describe_("due_date", null, "2026-09-30").text).toBe("changed due date from no due date to Sep 30");
    expect(describe_("due_date", "2026-09-30", null).text).toBe("changed due date from Sep 30 to no due date");
  });

  it("says which labels were added and removed", () => {
    expect(describe_("labels", '["Bug"]', '["Docs"]').text).toBe("added label Docs and removed label Bug");
    expect(describe_("labels", "[]", '["Bug","Docs"]').text).toBe("added labels Bug, Docs");
    expect(describe_("labels", '["Bug"]', "[]").text).toBe("removed label Bug");
  });

  it("keeps description changes short, with the full text as details", () => {
    expect(describe_("description", "old text", "new text")).toEqual({
      text: "changed the description",
      details: { before: "old text", after: "new text" },
    });
  });
});
