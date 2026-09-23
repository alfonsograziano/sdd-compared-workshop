import { asc, count, eq, inArray } from "drizzle-orm";
import { getDb, type Conn, type Db } from "./db";
import { comments, tasks, type Comment } from "./db/schema";
import { commentBodySchema } from "./validation";

/** The task's comments, oldest first. */
export function listComments(taskId: number, db: Db = getDb()): Comment[] {
  return db
    .select()
    .from(comments)
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt), asc(comments.id))
    .all();
}

export function createComment(taskId: number, body: string, db: Db = getDb()): Comment {
  const text = commentBodySchema.parse(body);
  const task = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) throw new Error(`Task ${taskId} not found`);
  return db.insert(comments).values({ taskId, body: text, createdAt: new Date() }).returning().get();
}

/** Changes the body. Saving the same text does not mark the comment as edited. */
export function updateComment(id: number, body: string, db: Db = getDb()): Comment {
  const text = commentBodySchema.parse(body);
  const current = db.select().from(comments).where(eq(comments.id, id)).get();
  if (!current) throw new Error(`Comment ${id} not found`);
  if (current.body === text) return current;
  return db
    .update(comments)
    .set({ body: text, updatedAt: new Date() })
    .where(eq(comments.id, id))
    .returning()
    .get();
}

export function deleteComment(id: number, db: Db = getDb()): void {
  db.delete(comments).where(eq(comments.id, id)).run();
}

/** Number of comments for each of the given tasks, in one query. Tasks with none are left out. */
export function countComments(taskIds: number[], db: Conn = getDb()): Map<number, number> {
  if (taskIds.length === 0) return new Map();
  const rows = db
    .select({ taskId: comments.taskId, count: count() })
    .from(comments)
    .where(inArray(comments.taskId, taskIds))
    .groupBy(comments.taskId)
    .all();
  return new Map(rows.map((r) => [r.taskId, r.count]));
}
