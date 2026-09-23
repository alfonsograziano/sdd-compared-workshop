import { describeActivity, listActivity } from "./activity";
import { listComments } from "./comments";
import { getDb, type Db } from "./db";
import type { Activity, ActivityField, Comment } from "./db/schema";
import { formatDateTime } from "./format";

/** One entry of a task's timeline, straight from the database. */
export type TimelineItem =
  | { kind: "comment"; id: number; at: Date; body: string; editedAt: Date | null }
  | {
      kind: "activity";
      id: number;
      at: Date;
      field: ActivityField | null;
      oldValue: string | null;
      newValue: string | null;
    };

/**
 * The same entry, ready to hand to a Client Component: times are formatted
 * on the server so server and browser render the same text.
 */
export type TimelineEntry =
  | { kind: "comment"; id: number; at: string; body: string; editedAt: string | null }
  | { kind: "activity"; id: number; at: string; text: string; details?: { before: string; after: string } };

/** Comments and activity in one list, oldest first. On a tie, activity comes first, then lower ids. */
export function mergeTimeline(comments: Comment[], activity: Activity[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...activity.map((a) => ({
      kind: "activity" as const,
      id: a.id,
      at: a.createdAt,
      field: a.field,
      oldValue: a.oldValue,
      newValue: a.newValue,
    })),
    ...comments.map((c) => ({
      kind: "comment" as const,
      id: c.id,
      at: c.createdAt,
      body: c.body,
      editedAt: c.updatedAt,
    })),
  ];
  const rank = { activity: 0, comment: 1 };
  return items.sort((a, b) => a.at.getTime() - b.at.getTime() || rank[a.kind] - rank[b.kind] || a.id - b.id);
}

export function getTimeline(taskId: number, db: Db = getDb()): TimelineItem[] {
  return mergeTimeline(listComments(taskId, db), listActivity(taskId, db));
}

/** Formats timeline items for the task page. */
export function toTimelineEntries(items: TimelineItem[]): TimelineEntry[] {
  return items.map((item): TimelineEntry => {
    if (item.kind === "comment") {
      return {
        kind: "comment",
        id: item.id,
        at: formatDateTime(item.at),
        body: item.body,
        editedAt: item.editedAt ? formatDateTime(item.editedAt) : null,
      };
    }
    const { text, details } = describeActivity(item);
    return { kind: "activity", id: item.id, at: formatDateTime(item.at), text, ...(details && { details }) };
  });
}
