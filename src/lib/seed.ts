import { sql } from "drizzle-orm";
import type { Db } from "./db";
import { activities, comments, labels, taskLabels, tasks } from "./db/schema";
import type { Priority, Status } from "./constants";
import { createTask } from "./tasks";

const LABELS = [
  { name: "Bug", color: "#eb5757" },
  { name: "Feature", color: "#5e6ad2" },
  { name: "Improvement", color: "#4cb782" },
  { name: "Design", color: "#bb87fc" },
  { name: "Docs", color: "#f2c94c" },
  { name: "Backend", color: "#26b5ce" },
];

type SeedTask = {
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  labels: string[];
  /** Days from today. Leave out for no due date. */
  dueInDays?: number;
};

const TASKS: SeedTask[] = [
  {
    title: "Login page crashes on Safari 17",
    description:
      "Steps to reproduce:\n\n1. Open `/login` in Safari 17\n2. Type any email\n3. The page goes blank\n\nThe console shows `TypeError: undefined is not an object`.",
    status: "in_progress",
    priority: "urgent",
    labels: ["Bug"],
    dueInDays: 1,
  },
  {
    title: "Add CSV export to the reports page",
    description: "Users want to download the monthly report as a **CSV** file so they can open it in a spreadsheet.",
    status: "todo",
    priority: "high",
    labels: ["Feature", "Backend"],
    dueInDays: 7,
  },
  {
    title: "Redesign the empty state for new workspaces",
    description: "Right now a new workspace shows a blank screen. Show a short welcome and one clear next step.",
    status: "todo",
    priority: "medium",
    labels: ["Design"],
  },
  {
    title: "Write the API rate limits guide",
    description: "Explain the limits per plan, the `429` response, and how to back off.",
    status: "backlog",
    priority: "low",
    labels: ["Docs"],
  },
  {
    title: "Search is slow for workspaces with 10k+ items",
    description: "p95 is about 2.4s. We should add an index on `items.title` and check the query plan.",
    status: "in_progress",
    priority: "high",
    labels: ["Bug", "Backend"],
    dueInDays: 3,
  },
  {
    title: "Keyboard shortcuts cheat sheet",
    description: "Show all shortcuts in a small dialog when the user presses `?`.",
    status: "backlog",
    priority: "medium",
    labels: ["Feature", "Design"],
  },
  {
    title: "Upgrade the payments SDK to v5",
    description: "v4 stops getting security fixes at the end of the year.",
    status: "todo",
    priority: "urgent",
    labels: ["Backend"],
    dueInDays: 14,
  },
  {
    title: "Set up error tracking for the web app",
    status: "done",
    priority: "high",
    labels: ["Improvement"],
    dueInDays: -5,
  },
  {
    title: "Dark mode colors fail contrast checks",
    description: "Secondary text on cards is below 4.5:1. Check it against WCAG AA.",
    status: "backlog",
    priority: "medium",
    labels: ["Bug", "Design"],
  },
  {
    title: "Onboarding checklist for new teams",
    description: "- Invite a teammate\n- Create the first project\n- Connect an integration",
    status: "backlog",
    priority: "none",
    labels: ["Feature"],
  },
  {
    title: "Remove the old v1 webhooks endpoint",
    description: "Nobody has called it in 90 days. Email the last three customers first.",
    status: "canceled",
    priority: "low",
    labels: ["Backend"],
  },
  {
    title: "Update the README with the new setup steps",
    status: "done",
    priority: "low",
    labels: ["Docs", "Improvement"],
  },
];

function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Deletes everything and fills the database with demo labels and tasks. */
export function seed(db: Db) {
  db.delete(comments).run();
  db.delete(activities).run();
  db.delete(taskLabels).run();
  db.delete(tasks).run();
  db.delete(labels).run();
  // Start ids from 1 again, so the demo always looks the same.
  db.run(sql`DELETE FROM sqlite_sequence`);

  const inserted = db.insert(labels).values(LABELS).returning().all();
  const labelId = new Map(inserted.map((l) => [l.name, l.id]));

  for (const task of TASKS) {
    createTask(
      {
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueInDays === undefined ? null : daysFromToday(task.dueInDays),
        labelIds: task.labels.map((name) => labelId.get(name)!),
      },
      db,
    );
  }
  return { labels: inserted.length, tasks: TASKS.length };
}
