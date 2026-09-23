"use client";

import { useState, useTransition } from "react";
import { addCommentAction, deleteCommentAction, updateCommentAction, type ActionResult } from "@/app/actions";
import { Markdown } from "./Markdown";

/** A timeline entry, already formatted on the server so server and browser agree on dates. */
export type TimelineItem =
  | { kind: "activity"; id: number; text: string; at: string }
  | { kind: "comment"; id: number; body: string; at: string; edited: boolean };

type Props = { taskId: number; items: TimelineItem[] };

/** Comments and activity of a task in one list, oldest first, with a comment box at the end. */
export function Timeline({ taskId, items }: Props) {
  return (
    <section aria-label="Activity" className="mt-10 border-t border-line pt-6">
      <h2 className="mb-4 text-[13px] font-medium">Activity</h2>
      <ol className="space-y-3">
        {items.map((item) =>
          item.kind === "activity" ? (
            <li
              key={`a${item.id}`}
              data-testid="activity-entry"
              className="flex items-center gap-2 pl-1 text-[12px] text-muted"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-muted/60" />
              <span className="text-fg/80">{item.text}</span>
              <span>·</span>
              <time>{item.at}</time>
            </li>
          ) : (
            <CommentItem key={`c${item.id}`} comment={item} />
          ),
        )}
      </ol>
      <NewComment taskId={taskId} />
    </section>
  );
}

function useSave() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function save(action: () => Promise<ActionResult>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDone?.();
      else setError(result.error);
    });
  }
  return { pending, error, save };
}

function CommentItem({ comment }: { comment: Extract<TimelineItem, { kind: "comment" }> }) {
  const [editing, setEditing] = useState(false);
  const { pending, error, save } = useSave();

  return (
    <li data-testid="comment" className="rounded-md border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[12px] text-muted">
        <time>{comment.at}</time>
        {comment.edited && <span data-testid="comment-edited">· edited</span>}
        {!editing && (
          <span className="ml-auto flex gap-1">
            <button type="button" className="rounded px-1.5 hover:bg-panel-hover hover:text-fg" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              type="button"
              className="rounded px-1.5 hover:bg-panel-hover hover:text-red-400"
              disabled={pending}
              onClick={() => {
                if (confirm("Delete this comment?")) save(() => deleteCommentAction(comment.id));
              }}
            >
              Delete
            </button>
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        {editing ? (
          <form
            action={(form) => {
              const body = String(form.get("body") ?? "");
              save(() => updateCommentAction(comment.id, body), () => setEditing(false));
            }}
          >
            <textarea
              name="body"
              aria-label="Edit comment"
              defaultValue={comment.body}
              autoFocus
              rows={4}
              className="w-full rounded-md border border-line bg-bg p-2 font-mono text-[13px] outline-none focus:border-accent"
            />
            <div className="mt-2 flex items-center gap-2">
              <button type="submit" className="btn btn-primary" disabled={pending}>
                Save
              </button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
              {error && <span className="text-[12px] text-red-400">{error}</span>}
            </div>
          </form>
        ) : (
          <>
            <Markdown>{comment.body}</Markdown>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
          </>
        )}
      </div>
    </li>
  );
}

function NewComment({ taskId }: { taskId: number }) {
  const [body, setBody] = useState("");
  const { pending, error, save } = useSave();

  return (
    <form
      className="mt-4"
      action={() => save(() => addCommentAction(taskId, body), () => setBody(""))}
    >
      <textarea
        aria-label="New comment"
        placeholder="Leave a comment… (markdown)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
        rows={3}
        className="w-full rounded-md border border-line bg-panel p-3 text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending || body.trim() === ""}>
          Comment
        </button>
        {error && <span className="text-[12px] text-red-400">{error}</span>}
      </div>
    </form>
  );
}
