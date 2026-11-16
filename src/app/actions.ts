"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createComment, deleteComment, updateComment } from "@/lib/comments";
import { NotFoundError } from "@/lib/errors";
import { createTask, deleteTask, moveTask, updateTask } from "@/lib/tasks";
import type { CommentBodyInput, CreateTaskInput, MoveTaskInput, UpdateTaskInput } from "@/lib/validation";

// Every mutation in the app goes through one of these Server Actions.
// They validate the id here; the data layer validates the rest with zod.

export type ActionResult = { ok: true; id: number } | { ok: false; error: string };

const taskIdSchema = z.number().int().positive();
const commentId = z.number().int().positive();

function run(fn: () => number): ActionResult {
  try {
    const id = fn();
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues.map((i) => i.message).join(", ") };
    }
    // A stale id (the task or comment was deleted elsewhere) is an expected error, not a crash.
    if (error instanceof NotFoundError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult> {
  return run(() => createTask(input).id);
}

export async function updateTaskAction(id: number, input: UpdateTaskInput): Promise<ActionResult> {
  return run(() => updateTask(taskIdSchema.parse(id), input).id);
}

export async function moveTaskAction(id: number, input: MoveTaskInput): Promise<ActionResult> {
  return run(() => moveTask(taskIdSchema.parse(id), input).id);
}

export async function deleteTaskAction(id: number): Promise<void> {
  deleteTask(taskIdSchema.parse(id));
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createCommentAction(taskId: number, input: CommentBodyInput): Promise<ActionResult> {
  return run(() => createComment(taskIdSchema.parse(taskId), input).id);
}

export async function updateCommentAction(id: number, input: CommentBodyInput): Promise<ActionResult> {
  return run(() => updateComment(commentId.parse(id), input).id);
}

export async function deleteCommentAction(id: number): Promise<ActionResult> {
  return run(() => {
    const parsed = commentId.parse(id);
    deleteComment(parsed);
    return parsed;
  });
}
