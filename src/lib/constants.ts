export const STATUSES = ["backlog", "todo", "in_progress", "done", "canceled"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  canceled: "Canceled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Higher number = more important. Used for sorting. */
export const PRIORITY_RANK: Record<Priority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

/** What an activity entry records: the task being created, or a change to one field. */
export const ACTIVITY_FIELDS = ["created", "title", "description", "status", "priority", "labels", "dueDate"] as const;
export type ActivityField = (typeof ACTIVITY_FIELDS)[number];
