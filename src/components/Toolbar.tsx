"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import type { Label } from "@/lib/db/schema";
import type { TaskFilters } from "@/lib/validation";
import { NewTaskButton } from "./NewTaskButton";

type Props = {
  title: string;
  filters: TaskFilters;
  labels: Label[];
  /** Extra URL params to keep when filters change, for example the list sort. */
  keep?: Record<string, string>;
};

/** Page header with search, filters and the "New task" button. Filters live in the URL. */
export function Toolbar({ title, filters, labels, keep = {} }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(next: Partial<Record<"q" | "priority" | "label", string>>) {
    const current = {
      q: filters.q ?? "",
      priority: filters.priority ?? "",
      label: filters.labelId ? String(filters.labelId) : "",
    };
    const params = new URLSearchParams(keep);
    for (const [key, value] of Object.entries({ ...current, ...next })) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilters = Boolean(filters.q || filters.priority || filters.labelId);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
      <h1 className="mr-2 font-medium">{title}</h1>
      <input
        type="search"
        placeholder="Search titles…"
        aria-label="Search titles"
        defaultValue={filters.q}
        className="control w-56"
        onChange={(e) => {
          const q = e.target.value;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => apply({ q }), 250);
        }}
      />
      <select
        aria-label="Filter by priority"
        className="control"
        value={filters.priority ?? ""}
        onChange={(e) => apply({ priority: e.target.value })}
      >
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by label"
        className="control"
        value={filters.labelId ?? ""}
        onChange={(e) => apply({ label: e.target.value })}
      >
        <option value="">Any label</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button type="button" className="btn" onClick={() => router.replace(pathname)}>
          Clear
        </button>
      )}
      <div className="ml-auto">
        <NewTaskButton />
      </div>
    </header>
  );
}
