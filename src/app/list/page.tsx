import Link from "next/link";
import { CommentCount, PriorityIcon, StatusIcon } from "@/components/icons";
import { LabelPill } from "@/components/LabelPill";
import { Toolbar } from "@/components/Toolbar";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { filtersFromSearchParams } from "@/lib/filters";
import { formatDueDate, isOverdue, SORTS, sortTasks, taskKey, type Sort } from "@/lib/format";
import { listLabels, listTasks } from "@/lib/tasks";

const SORT_LABELS: Record<Sort, string> = { status: "Status", priority: "Priority", due: "Due date" };

export default async function ListPage({ searchParams }: PageProps<"/list">) {
  const params = await searchParams;
  const filters = filtersFromSearchParams(params);
  const sort: Sort = SORTS.find((s) => s === params.sort) ?? "status";
  const tasks = sortTasks(listTasks(filters), sort);

  // Sort links keep the current filters.
  function sortHref(next: Sort) {
    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.priority) query.set("priority", filters.priority);
    if (filters.labelId) query.set("label", String(filters.labelId));
    if (next !== "status") query.set("sort", next);
    const qs = query.toString();
    return qs ? `/list?${qs}` : "/list";
  }

  return (
    <>
      <Toolbar
        title="List"
        filters={filters}
        labels={listLabels()}
        keep={sort === "status" ? {} : { sort }}
      />
      <div className="flex items-center gap-1 border-b border-line px-4 py-2 text-[12px] text-muted">
        Sort by
        {SORTS.map((s) => (
          <Link
            key={s}
            href={sortHref(s)}
            className={`rounded px-2 py-0.5 hover:bg-panel-hover ${s === sort ? "bg-panel-hover text-fg" : ""}`}
          >
            {SORT_LABELS[s]}
          </Link>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="text-[12px] text-muted">
            <tr className="border-b border-line">
              <th className="w-24 px-4 py-2 font-normal">ID</th>
              <th className="px-2 py-2 font-normal">Title</th>
              <th className="w-36 px-2 py-2 font-normal">Status</th>
              <th className="w-32 px-2 py-2 font-normal">Priority</th>
              <th className="w-56 px-2 py-2 font-normal">Labels</th>
              <th className="w-24 px-4 py-2 font-normal">Due</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-line hover:bg-panel-hover">
                <td className="px-4 py-2 font-mono text-[12px] text-muted">{taskKey(task.id)}</td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2">
                    <Link href={`/tasks/${task.id}`} className="hover:underline">
                      {task.title}
                    </Link>
                    <CommentCount count={task.commentCount} />
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2">
                    <StatusIcon status={task.status} />
                    {STATUS_LABELS[task.status]}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2">
                    <PriorityIcon priority={task.priority} />
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <span className="flex flex-wrap gap-1">
                    {task.labels.map((label) => (
                      <LabelPill key={label.id} label={label} />
                    ))}
                  </span>
                </td>
                <td className={`px-4 py-2 text-[12px] ${isOverdue(task) ? "text-red-400" : "text-muted"}`}>
                  {task.dueDate ? formatDueDate(task.dueDate) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <p className="p-8 text-center text-muted">No tasks match these filters.</p>}
      </div>
    </>
  );
}
