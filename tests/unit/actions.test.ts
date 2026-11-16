import { describe, expect, it, vi } from "vitest";

// The actions use the shared database; point it at a throwaway one.
vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const {
  createCommentAction,
  createTaskAction,
  deleteCommentAction,
  moveTaskAction,
  updateCommentAction,
  updateTaskAction,
} = await import("@/app/actions");

describe("comment actions", () => {
  it("create, edit and delete a comment", async () => {
    const task = await createTaskAction({ title: "x" });
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    const comment = await createCommentAction(task.id, { body: "**hi**" });
    expect(comment.ok).toBe(true);
    if (!comment.ok) return;
    expect(await updateCommentAction(comment.id, { body: "b" })).toEqual({ ok: true, id: comment.id });
    expect(await deleteCommentAction(comment.id)).toEqual({ ok: true, id: comment.id });
  });

  it("returns an error for an empty comment", async () => {
    const task = await createTaskAction({ title: "x" });
    if (!task.ok) throw new Error("setup failed");
    expect(await createCommentAction(task.id, { body: "   " })).toEqual({
      ok: false,
      error: "Comment can't be empty",
    });
  });

  it("returns { ok: false } for a stale comment or task id", async () => {
    expect(await createCommentAction(999, { body: "x" })).toMatchObject({ ok: false, error: "Task 999 not found" });
    expect(await updateCommentAction(999, { body: "x" })).toMatchObject({ ok: false, error: "Comment 999 not found" });
    expect(await deleteCommentAction(999)).toMatchObject({ ok: false, error: "Comment 999 not found" });
    expect(await updateTaskAction(999, { title: "x" })).toMatchObject({ ok: false, error: "Task 999 not found" });
    expect(await moveTaskAction(999, { status: "todo", beforeId: null })).toMatchObject({ ok: false });
  });
});
