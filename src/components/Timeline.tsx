"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { createCommentAction, deleteCommentAction, updateCommentAction } from "@/app/actions";
import { Markdown } from "./Markdown";

/** A timeline entry, ready to show. The server page formats the times. */
export type TimelineItem =
  | { kind: "activity"; id: number; time: string; text: string }
  | { kind: "comment"; id: number; time: string; body: string; edited: boolean };

type Props = {
  taskId: number;
  items: TimelineItem[];
};

/** Comments and activity for a task, oldest first, with a box to add a comment at the end. */
export function Timeline({ taskId, items }: Props) {
  return (
    <section aria-label="Timeline" className="mt-10 border-t border-line pt-6">
      <h2 className="mb-3 text-[13px] font-medium">Timeline</h2>
      <ol className="space-y-2" data-testid="timeline">
        {items.map((item) =>
          item.kind === "activity" ? (
            <ActivityRow key={`a-${item.id}`} item={item} />
          ) : (
            <CommentRow key={`c-${item.id}`} item={item} />
          ),
        )}
      </ol>
      <NewComment taskId={taskId} />
    </section>
  );
}

function ActivityRow({ item }: { item: Extract<TimelineItem, { kind: "activity" }> }) {
  return (
    <li data-testid="activity-entry" className="flex items-baseline gap-2 px-1 text-[12px] text-muted">
      <span className="size-1.5 shrink-0 -translate-y-px rounded-full bg-muted/60" aria-hidden="true" />
      <span className="min-w-0 break-words">
        {item.text} <span className="whitespace-nowrap">· {item.time}</span>
      </span>
    </li>
  );
}

function CommentRow({ item }: { item: Extract<TimelineItem, { kind: "comment" }> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCommentAction(item.id, { body: draft });
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  function remove() {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCommentAction(item.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li data-testid="comment" className="rounded-md border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[12px] text-muted">
        <span>{item.time}</span>
        {item.edited && <span>· edited</span>}
        {!editing && (
          <span className="ml-auto flex gap-1">
            <button
              type="button"
              aria-label={`Edit comment from ${item.time}`}
              className="rounded px-1.5 hover:bg-panel-hover hover:text-fg"
              disabled={pending}
              onClick={() => {
                setDraft(item.body);
                setError(null);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Delete comment from ${item.time}`}
              className="rounded px-1.5 hover:bg-panel-hover hover:text-red-400"
              disabled={pending}
              onClick={remove}
            >
              Delete
            </button>
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        {editing ? (
          <>
            <textarea
              aria-label="Edit comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              readOnly={pending}
              onKeyDown={(e) => submitOnModEnter(e, save)}
              autoFocus
              rows={4}
              className="w-full rounded-md border border-line bg-bg p-2 font-mono text-[13px] outline-none focus:border-accent"
            />
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
                Save
              </button>
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              {error && <span className="text-[12px] text-red-400">{error}</span>}
            </div>
          </>
        ) : (
          <>
            <Markdown>{item.body}</Markdown>
            {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}
          </>
        )}
      </div>
    </li>
  );
}

function NewComment({ taskId }: { taskId: number }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createCommentAction(taskId, { body });
      // On error the typed text stays in the box.
      if (result.ok) setBody("");
      else setError(result.error);
    });
  }

  return (
    <form
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label="New comment"
        placeholder="Leave a comment… (markdown)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        readOnly={pending}
        onKeyDown={(e) => submitOnModEnter(e, submit)}
        rows={3}
        className="w-full rounded-md border border-line bg-panel p-2 text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Comment
        </button>
        {error && <span className="text-[12px] text-red-400">{error}</span>}
      </div>
    </form>
  );
}

/** Cmd+Enter or Ctrl+Enter saves. */
function submitOnModEnter(e: KeyboardEvent<HTMLTextAreaElement>, save: () => void) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    save();
  }
}
