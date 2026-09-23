import { z } from "zod";
import { PRIORITIES, STATUSES } from "./constants";

const title = z.string().trim().min(1, "Title is required").max(200);
const description = z.string().max(20_000);
const dueDate = z.iso.date().nullable();
const labelIds = z.array(z.number().int().positive());

export const createTaskSchema = z.object({
  title,
  description: description.default(""),
  status: z.enum(STATUSES).default("backlog"),
  priority: z.enum(PRIORITIES).default("none"),
  dueDate: dueDate.default(null),
  labelIds: labelIds.default([]),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title,
    description,
    status: z.enum(STATUSES),
    priority: z.enum(PRIORITIES),
    dueDate,
    labelIds,
  })
  .partial();
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
  status: z.enum(STATUSES),
  /** The task that should end up right after the moved one. Null means "put it last". */
  beforeId: z.number().int().positive().nullable(),
});
export type MoveTaskInput = z.input<typeof moveTaskSchema>;

export const taskFiltersSchema = z.object({
  q: z.string().trim().optional(),
  priority: z.enum(PRIORITIES).optional(),
  labelId: z.coerce.number().int().positive().optional(),
});
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
