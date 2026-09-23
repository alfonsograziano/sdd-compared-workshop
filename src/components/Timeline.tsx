"use client";

import { useState, useTransition } from "react";
import { addCommentAction, deleteCommentAction, updateCommentAction } from "@/app/actions";
import type { Comment } from "@/lib/db/schema";
import { describeActivity, formatDateTime } from "@/lib/format";
import type { TimelineEntry } from "@/lib/tasks";
import { Markdown } from "./Markdown";

/** Comments and activity of one task, oldest first, with a comment box at the bottom. */
export function Timeline({ taskId, entries }: { taskId: number; entries: TimelineEntry[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Controlled, so a failed save keeps the text (React resets uncontrolled forms after an action).
  const [body, setBody] = useState("");

  function addComment() {
    setError(null);
    startTransition(async () => {
      const result = await addCommentAction(taskId, body);
      if (result.ok) setBody("");
      else setError(result.error);
    });
  }

  return (
    <section aria-label="Activity" className="mt-10 border-t border-line pt-6">
      <h2 className="mb-4 text-[13px] font-medium">Activity</h2>
      <ol data-testid="timeline" className="space-y-3">
        {entries.map((entry) =>
          entry.kind === "comment" ? (
            <CommentItem key={`c${entry.id}`} comment={entry} />
          ) : (
            <li
              key={`a${entry.id}`}
              data-testid="activity-entry"
              className="flex items-baseline gap-2 pl-1 text-[12px] text-muted"
            >
              <span className="size-1.5 shrink-0 translate-y-[-1px] rounded-full bg-muted/60" />
              <span className="text-fg/80">{describeActivity(entry)}</span>
              <span>· {formatDateTime(entry.createdAt)}</span>
            </li>
          ),
        )}
      </ol>

      <form action={addComment} className="mt-5">
        <textarea
          name="body"
          aria-label="New comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment… (markdown works)"
          rows={3}
          className="w-full rounded-md border border-line bg-panel p-3 text-[13px] outline-none focus:border-accent"
        />
        <div className="mt-2 flex items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            Comment
          </button>
          {error && <span className="text-[12px] text-red-400">{error}</span>}
        </div>
      </form>
    </section>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(comment.body);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateCommentAction(comment.id, draft);
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  function remove() {
    if (!confirm("Delete this comment?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCommentAction(comment.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li data-testid="comment" className="rounded-md border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[12px] text-muted">
        <span>{formatDateTime(comment.createdAt)}</span>
        {comment.editedAt && <span title={`Edited ${formatDateTime(comment.editedAt)}`}>(edited)</span>}
        {!editing && (
          <span className="ml-auto flex gap-1">
            <button
              type="button"
              aria-label="Edit comment"
              className="rounded px-1.5 hover:bg-panel-hover hover:text-fg"
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label="Delete comment"
              className="rounded px-1.5 hover:bg-panel-hover hover:text-red-400"
              onClick={remove}
              disabled={pending}
            >
              Delete
            </button>
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        {editing ? (
          <form action={save}>
            <textarea
              name="body"
              aria-label="Comment text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={4}
              className="w-full rounded-md border border-line bg-bg p-2 font-mono text-[13px] outline-none focus:border-accent"
            />
            <div className="mt-2 flex items-center gap-2">
              <button type="submit" className="btn btn-primary" disabled={pending}>
                Save
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <Markdown>{comment.body}</Markdown>
        )}
        {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}
      </div>
    </li>
  );
}
