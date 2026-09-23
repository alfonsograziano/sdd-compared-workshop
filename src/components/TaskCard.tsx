import Link from "next/link";
import type { MouseEvent } from "react";
import { formatDueDate, isOverdue, taskKey } from "@/lib/format";
import type { Task } from "@/lib/tasks";
import { CommentCount } from "./CommentCount";
import { PriorityIcon } from "./icons";
import { LabelPill } from "./LabelPill";

type Props = {
  task: Task;
  onClick?: (e: MouseEvent) => void;
};

export function TaskCard({ task, onClick }: Props) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      onClick={onClick}
      draggable={false}
      data-testid="task-card"
      className="block rounded-md border border-line bg-panel p-2.5 hover:border-muted/40"
    >
      <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
        <span className="font-mono">{taskKey(task.id)}</span>
        <span className="ml-auto">
          <PriorityIcon priority={task.priority} />
        </span>
      </div>
      <div className="mb-2 leading-snug">{task.title}</div>
      <div className="flex flex-wrap items-center gap-1">
        {task.labels.map((label) => (
          <LabelPill key={label.id} label={label} />
        ))}
        {task.dueDate && (
          <span className={`text-[11px] ${isOverdue(task) ? "text-red-400" : "text-muted"}`}>
            {formatDueDate(task.dueDate)}
          </span>
        )}
        <span className="ml-auto">
          <CommentCount count={task.commentCount} />
        </span>
      </div>
    </Link>
  );
}
