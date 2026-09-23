import type { Label } from "@/lib/db/schema";

export function LabelPill({ label }: { label: Pick<Label, "name" | "color"> }) {
  return (
    <span className="inline-flex h-5 items-center gap-1.5 rounded-full border border-line px-2 text-[11px] text-muted">
      <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
      {label.name}
    </span>
  );
}
