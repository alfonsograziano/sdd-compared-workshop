import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/TaskDetail";
import { formatDateTime, taskKey } from "@/lib/format";
import { getTask, getTimeline, listLabels } from "@/lib/tasks";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const id = Number((await params).id);
  const task = Number.isInteger(id) && id > 0 ? getTask(id) : null;
  if (!task) notFound();

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4 text-[13px]">
        <Link href="/" className="text-muted hover:text-fg">
          Board
        </Link>
        <span className="text-muted">›</span>
        <span className="font-mono">{taskKey(task.id)}</span>
      </header>
      <TaskDetail
        task={task}
        labels={listLabels()}
        timeline={getTimeline(task.id)}
        createdAt={formatDateTime(task.createdAt)}
        updatedAt={formatDateTime(task.updatedAt)}
      />
    </>
  );
}
