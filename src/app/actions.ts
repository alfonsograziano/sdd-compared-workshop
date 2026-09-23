"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  addComment,
  createTask,
  deleteComment,
  deleteTask,
  moveTask,
  NotFoundError,
  updateComment,
  updateTask,
} from "@/lib/tasks";
import type { CreateTaskInput, MoveTaskInput, UpdateTaskInput } from "@/lib/validation";

// Every mutation in the app goes through one of these Server Actions.
// They validate the id here; the data layer validates the rest with zod.

export type ActionResult = { ok: true; id: number } | { ok: false; error: string };

const taskId = z.number().int().positive();
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
    if (error instanceof NotFoundError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function createTaskAction(input: CreateTaskInput): Promise<ActionResult> {
  return run(() => createTask(input).id);
}

export async function updateTaskAction(id: number, input: UpdateTaskInput): Promise<ActionResult> {
  return run(() => updateTask(taskId.parse(id), input).id);
}

export async function moveTaskAction(id: number, input: MoveTaskInput): Promise<ActionResult> {
  return run(() => moveTask(taskId.parse(id), input).id);
}

export async function deleteTaskAction(id: number): Promise<void> {
  deleteTask(taskId.parse(id));
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addCommentAction(id: number, body: string): Promise<ActionResult> {
  return run(() => addComment(taskId.parse(id), body).id);
}

export async function updateCommentAction(id: number, body: string): Promise<ActionResult> {
  return run(() => updateComment(commentId.parse(id), body).id);
}

export async function deleteCommentAction(id: number): Promise<ActionResult> {
  return run(() => {
    const cid = commentId.parse(id);
    deleteComment(cid);
    return cid;
  });
}
