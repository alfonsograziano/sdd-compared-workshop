"use client";

import { useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { createCommentAction, deleteCommentAction, updateCommentAction, type ActionResult } from "@/app/actions";
import type { TimelineEntry } from "@/lib/timeline";
import { Markdown } from "./Markdown";

type Props = {
  taskId: number;
  entries: TimelineEntry[];
};

/** Comments and activity for one task, oldest first, with the new-comment form at the end. */
export function Timeline({ taskId, entries }: Props) {
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="mb-4 text-[13px] font-medium">Activity</h2>
      <ol aria-label="Timeline" className="space-y-3">
        {entries.map((entry) =>
          entry.kind === "comment" ? (
            <CommentEntry key={`comment-${entry.id}`} comment={entry} />
          ) : (
            <ActivityEntry key={`activity-${entry.id}`} activity={entry} />
          ),
        )}
      </ol>
      <NewCommentForm taskId={taskId} />
    </section>
  );
}

type CommentView = Extract<TimelineEntry, { kind: "comment" }>;
type ActivityView = Extract<TimelineEntry, { kind: "activity" }>;

function ActivityEntry({ activity }: { activity: ActivityView }) {
  const time = <span className="ml-2 whitespace-nowrap text-[11px]">{activity.at}</span>;
  return (
    <li data-testid="timeline-activity" className="px-1 text-[12px] text-muted">
      {activity.details ? (
        <details>
          <summary className="cursor-pointer hover:text-fg">
            {activity.text}
            {time}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <DescriptionVersion label="Before" text={activity.details.before} />
            <DescriptionVersion label="After" text={activity.details.after} />
          </div>
        </details>
      ) : (
        <p>
          {activity.text}
          {time}
        </p>
      )}
    </li>
  );
}

function DescriptionVersion({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-2">
      <div className="mb-1 text-[11px] font-medium">{label}</div>
      <pre className="whitespace-pre-wrap break-words font-mono text-[12px] text-fg">{text || "(empty)"}</pre>
    </div>
  );
}

function CommentEntry({ comment }: { comment: CommentView }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const { pending, error, submit } = useAction();

  function save(e: FormEvent) {
    e.preventDefault();
    submit(() => updateCommentAction(comment.id, draft), () => setEditing(false));
  }

  function remove() {
    if (confirm("Delete this comment?")) submit(() => deleteCommentAction(comment.id));
  }

  return (
    <li data-testid="timeline-comment" className="rounded-md border border-line bg-panel p-3">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted">
        <span>{comment.at}</span>
        {comment.editedAt && (
          <span
            tabIndex={0}
            title={`Edited ${comment.editedAt}`}
            aria-label={`Edited ${comment.editedAt}`}
            className="cursor-default rounded outline-none focus:text-fg"
          >
            edited
          </span>
        )}
        {!editing && (
          <span className="ml-auto flex gap-1">
            <button
              type="button"
              aria-label="Edit comment"
              className="rounded px-1.5 py-0.5 hover:bg-panel-hover hover:text-fg"
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
              className="rounded px-1.5 py-0.5 text-red-400 hover:bg-panel-hover"
              onClick={remove}
              disabled={pending}
            >
              Delete
            </button>
          </span>
        )}
      </div>
      {editing ? (
        <form onSubmit={save}>
          <textarea
            aria-label="Edit comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={submitOnModEnter}
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
          {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}
        </>
      )}
    </li>
  );
}

function NewCommentForm({ taskId }: { taskId: number }) {
  const [body, setBody] = useState("");
  const { pending, error, submit } = useAction();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(() => createCommentAction(taskId, body), () => setBody(""));
  }

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <textarea
        aria-label="New comment"
        placeholder="Leave a comment… (markdown)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={submitOnModEnter}
        rows={3}
        className="w-full rounded-md border border-line bg-panel p-3 font-mono text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-2 flex items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          Comment
        </button>
        {body && (
          <button type="button" className="btn" onClick={() => setBody("")}>
            Cancel
          </button>
        )}
        {pending && <span className="text-[12px] text-muted">Saving…</span>}
        {error && <span className="text-[12px] text-red-400">{error}</span>}
      </div>
    </form>
  );
}

/** Cmd+Enter or Ctrl+Enter submits the form the textarea is in. */
function submitOnModEnter(e: KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }
}

/** Runs a Server Action in a transition and keeps its error message. */
function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }

  return { pending, error, submit };
}
