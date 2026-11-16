import { describeActivity, listActivity } from "./activity";
import { listComments } from "./comments";
import { getDb, type Conn } from "./db";

export type TimelineEntry =
  | { kind: "activity"; id: number; createdAt: Date; text: string }
  | { kind: "comment"; id: number; createdAt: Date; body: string; editedAt: Date | null };

/**
 * Comments and activity for one task in one list, oldest first.
 * Ties keep a stable order: activity before comments, then by id.
 * A comment stays where it was written, even after an edit.
 */
export function getTimeline(taskId: number, db: Conn = getDb()): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...listActivity(taskId, db).map((a) => ({
      kind: "activity" as const,
      id: a.id,
      createdAt: a.createdAt,
      text: describeActivity(a),
    })),
    ...listComments(taskId, db).map((c) => ({
      kind: "comment" as const,
      id: c.id,
      createdAt: c.createdAt,
      body: c.body,
      editedAt: c.editedAt,
    })),
  ];
  const kindOrder = { activity: 0, comment: 1 };
  return entries.sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || kindOrder[a.kind] - kindOrder[b.kind] || a.id - b.id,
  );
}
