import { asc, count, eq, inArray } from "drizzle-orm";
import { getDb, type Conn, type Db } from "./db";
import { comments, tasks, type Comment } from "./db/schema";
import { NotFoundError } from "./errors";
import { commentBodySchema, type CommentBodyInput } from "./validation";

export type { Comment };

/** All comments on a task, oldest first. */
export function listComments(taskId: number, db: Conn = getDb()): Comment[] {
  return db
    .select()
    .from(comments)
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .all();
}

export function createComment(taskId: number, input: CommentBodyInput, db: Db = getDb()): Comment {
  const { body } = commentBodySchema.parse(input);
  return db.transaction((tx) => {
    const task = tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
    if (!task) throw new NotFoundError(`Task ${taskId} not found`);
    return tx.insert(comments).values({ taskId, body, createdAt: new Date() }).returning().get();
  });
}

/** Saves a new body. Only a save that changes the body (after trimming) marks the comment as edited. */
export function updateComment(id: number, input: CommentBodyInput, db: Db = getDb()): Comment {
  const { body } = commentBodySchema.parse(input);
  return db.transaction((tx) => {
    const current = tx.select().from(comments).where(eq(comments.id, id)).get();
    if (!current) throw new NotFoundError(`Comment ${id} not found`);
    if (current.body === body) return current;
    return tx
      .update(comments)
      .set({ body, editedAt: new Date() })
      .where(eq(comments.id, id))
      .returning()
      .get();
  });
}

export function deleteComment(id: number, db: Db = getDb()): void {
  const deleted = db.delete(comments).where(eq(comments.id, id)).returning({ id: comments.id }).all();
  if (deleted.length === 0) throw new NotFoundError(`Comment ${id} not found`);
}

/** Number of comments per task id. Tasks without comments are left out. */
export function countComments(taskIds: number[], db: Conn = getDb()): Map<number, number> {
  if (taskIds.length === 0) return new Map();
  const rows = db
    .select({ taskId: comments.taskId, n: count() })
    .from(comments)
    .where(inArray(comments.taskId, taskIds))
    .groupBy(comments.taskId)
    .all();
  return new Map(rows.map((r) => [r.taskId, r.n]));
}
