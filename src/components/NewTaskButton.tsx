"use client";

import { useEffect, useState, useTransition } from "react";
import { createTaskAction } from "@/app/actions";
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Priority, type Status } from "@/lib/constants";

/** "New task" button plus its dialog. Press "c" anywhere on the page to open it. */
export function NewTaskButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true]");
      if (e.key === "c" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} title="New task (C)">
        + New task
      </button>
      {open && <NewTaskDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function NewTaskDialog({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await createTaskAction({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        status: form.get("status") as Status,
        priority: form.get("priority") as Priority,
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-label="New task"
        action={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-line bg-panel p-4 shadow-2xl"
      >
        <input
          name="title"
          aria-label="Title"
          placeholder="Task title"
          autoFocus
          required
          className="bg-transparent text-base font-medium outline-none placeholder:text-muted"
        />
        <textarea
          name="description"
          aria-label="Description"
          placeholder="Add a description… (markdown)"
          rows={4}
          className="resize-none bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <div className="flex items-center gap-2">
          <select name="status" aria-label="Status" defaultValue="todo" className="control">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select name="priority" aria-label="Priority" defaultValue="none" className="control">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          {error && <span className="text-xs text-red-400">{error}</span>}
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              Create task
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
