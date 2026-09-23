import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from "@/lib/constants";

const STATUS_COLORS: Record<Status, string> = {
  backlog: "#8b8b94",
  todo: "#c4c4cc",
  in_progress: "#f2c94c",
  done: "#5e6ad2",
  canceled: "#8b8b94",
};

export function StatusIcon({ status }: { status: Status }) {
  const color = STATUS_COLORS[status];
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-label={STATUS_LABELS[status]} role="img">
      {status === "backlog" && <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />}
      {status === "todo" && <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="1.5" />}
      {status === "in_progress" && (
        <>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={color} strokeWidth="1.5" />
          <path d="M7 3.5 A3.5 3.5 0 0 1 7 10.5 Z" fill={color} />
        </>
      )}
      {status === "done" && (
        <>
          <circle cx="7" cy="7" r="6" fill={color} />
          <path d="M4.5 7.2 6.2 8.8 9.5 5.4" fill="none" stroke="white" strokeWidth="1.5" />
        </>
      )}
      {status === "canceled" && (
        <>
          <circle cx="7" cy="7" r="6" fill={color} />
          <path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  const label = PRIORITY_LABELS[priority];
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-label={label} role="img">
        <rect x="1" y="1" width="12" height="12" rx="3" fill="#f2994a" />
        <path d="M7 3.8v4M7 9.6v.6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  const filled = { none: 0, low: 1, medium: 2, high: 3 }[priority];
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0 text-muted" aria-label={label} role="img">
      {priority === "none" ? (
        <path d="M2 7h2M6 7h2M10 7h2" stroke="currentColor" strokeWidth="1.5" />
      ) : (
        [0, 1, 2].map((i) => (
          <rect
            key={i}
            x={2 + i * 4}
            y={9 - i * 3}
            width="2.5"
            height={3 + i * 3}
            rx="0.6"
            fill="currentColor"
            opacity={i < filled ? 1 : 0.3}
          />
        ))
      )}
    </svg>
  );
}

/** Small speech bubble with the number of comments. Renders nothing for 0. */
export function CommentCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      data-testid="comment-count"
      aria-label={`${count} ${count === 1 ? "comment" : "comments"}`}
      className="inline-flex items-center gap-1 text-[11px] text-muted"
    >
      <svg viewBox="0 0 14 14" className="size-3 shrink-0" aria-hidden="true">
        <path
          d="M2.5 3.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H6l-2.5 2v-2h0a1 1 0 0 1-1-1z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      {count}
    </span>
  );
}
