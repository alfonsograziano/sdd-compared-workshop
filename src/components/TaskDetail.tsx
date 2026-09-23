"use client";

import { useState, useTransition, type ReactNode } from "react";
import { deleteTaskAction, updateTaskAction } from "@/app/actions";
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Priority, type Status } from "@/lib/constants";
import type { Label } from "@/lib/db/schema";
import type { Task, TimelineEntry } from "@/lib/tasks";
import type { UpdateTaskInput } from "@/lib/validation";
import { PriorityIcon, StatusIcon } from "./icons";
import { Markdown } from "./Markdown";
import { Timeline } from "./Timeline";

type Props = {
  task: Task;
  labels: Label[];
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
};

/** Every field of a task, editable in place. Each change is saved right away. */
export function TaskDetail({ task, labels, timeline, createdAt, updatedAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);

  function save(input: UpdateTaskInput) {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction(task.id, input);
      if (!result.ok) setError(result.error);
    });
  }

  const labelIds = task.labels.map((l) => l.id);
  function toggleLabel(id: number) {
    save({ labelIds: labelIds.includes(id) ? labelIds.filter((l) => l !== id) : [...labelIds, id] });
  }

  return (
    <div className="flex min-h-0 flex-1">
      <article className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-3xl pb-48">
          <input
            key={task.title}
            aria-label="Title"
            defaultValue={task.title}
            className="mb-4 w-full bg-transparent text-2xl font-semibold outline-none"
            onBlur={(e) => {
              const title = e.target.value.trim();
              if (title && title !== task.title) save({ title });
              else e.target.value = task.title;
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />

          {editingDescription ? (
            <form
              action={(form) => {
                save({ description: String(form.get("description") ?? "") });
                setEditingDescription(false);
              }}
            >
              <textarea
                name="description"
                aria-label="Description"
                defaultValue={task.description}
                autoFocus
                rows={10}
                className="w-full rounded-md border border-line bg-panel p-3 font-mono text-[13px] outline-none focus:border-accent"
              />
              <div className="mt-2 flex gap-2">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button type="button" className="btn" onClick={() => setEditingDescription(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="Edit description"
              onClick={() => setEditingDescription(true)}
              onKeyDown={(e) => e.key === "Enter" && setEditingDescription(true)}
              className="-mx-3 cursor-text rounded-md px-3 py-2 hover:bg-panel-hover"
            >
              {task.description ? (
                <Markdown>{task.description}</Markdown>
              ) : (
                <p className="text-sm text-muted">Add a description…</p>
              )}
            </div>
          )}

          <Timeline taskId={task.id} entries={timeline} />
        </div>
      </article>

      <aside className="w-72 shrink-0 space-y-5 overflow-y-auto border-l border-line p-5">
        <Field label="Status">
          <div className="flex items-center gap-2">
            <StatusIcon status={task.status} />
            <select
              aria-label="Status"
              className="control flex-1"
              value={task.status}
              onChange={(e) => save({ status: e.target.value as Status })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Priority">
          <div className="flex items-center gap-2">
            <PriorityIcon priority={task.priority} />
            <select
              aria-label="Priority"
              className="control flex-1"
              value={task.priority}
              onChange={(e) => save({ priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field label="Labels">
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => {
              const on = labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleLabel(label.id)}
                  className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[12px] ${
                    on ? "border-muted/60 text-fg" : "border-line text-muted opacity-60 hover:opacity-100"
                  }`}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Due date">
          <input
            type="date"
            aria-label="Due date"
            className="control w-full"
            value={task.dueDate ?? ""}
            onChange={(e) => save({ dueDate: e.target.value || null })}
          />
        </Field>

        <div className="space-y-1 border-t border-line pt-4 text-[12px] text-muted">
          <div>Created {createdAt}</div>
          <div>Updated {updatedAt}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn text-red-400"
            onClick={() => {
              if (confirm("Delete this task?")) startTransition(() => deleteTaskAction(task.id));
            }}
          >
            Delete task
          </button>
          {pending && <span className="text-[12px] text-muted">Saving…</span>}
          {error && <span className="text-[12px] text-red-400">{error}</span>}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] text-muted">{label}</div>
      {children}
    </div>
  );
}
