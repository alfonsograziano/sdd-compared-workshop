import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ACTIVITY_FIELDS, PRIORITIES, STATUSES } from "../constants";

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status", { enum: STATUSES }).notNull().default("backlog"),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("none"),
    /** Calendar date as YYYY-MM-DD, or null when there is no due date. */
    dueDate: text("due_date"),
    /** Order inside a status column. Lower comes first. */
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (t) => [index("tasks_status_position_idx").on(t.status, t.position)],
);

export const labels = sqliteTable("labels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  /** Hex color, for example #5e6ad2. */
  color: text("color").notNull(),
});

export const taskLabels = sqliteTable(
  "task_labels",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    /** Markdown. */
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
    /** Set the first time the body really changes; null means never edited. */
    editedAt: integer("edited_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("comments_task_id_idx").on(t.taskId)],
);

/**
 * One entry per task creation and per real field change. Values are stored raw
 * (for example "medium", "2026-09-24", or label names joined by ", ") and turned
 * into words at display time.
 */
export const activities = sqliteTable(
  "activities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    field: text("field", { enum: ACTIVITY_FIELDS }).notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (t) => [index("activities_task_id_idx").on(t.taskId)],
);

export type TaskRow = typeof tasks.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Activity = typeof activities.$inferSelect;
