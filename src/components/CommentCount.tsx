import { CommentIcon } from "./icons";

/** A comment icon and the number of comments. Renders nothing when there are none. */
export function CommentCount({ count }: { count: number }) {
  if (count === 0) return null;
  const label = `${count} ${count === 1 ? "comment" : "comments"}`;
  return (
    <span
      data-testid="comment-count"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1 text-[11px] text-muted"
    >
      <CommentIcon />
      {count}
    </span>
  );
}
