"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/list", label: "List" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-line bg-panel p-3">
      <div className="mb-4 flex items-center gap-2 px-2 font-semibold">
        <span className="size-5 rounded bg-accent" />
        Tasks
      </div>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-2 py-1.5 text-[13px] hover:bg-panel-hover ${
            pathname === link.href ? "bg-panel-hover font-medium text-fg" : "text-muted"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
