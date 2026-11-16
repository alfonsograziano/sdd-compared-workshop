import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db";
import { getTimeline } from "@/lib/tasks";

const DRIZZLE = path.join(process.cwd(), "drizzle");
let tmp: string;

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

/** A migrations folder that holds only the first migration, as on master. */
function initOnlyFolder(dir: string) {
  const folder = path.join(dir, "drizzle-init");
  fs.mkdirSync(path.join(folder, "meta"), { recursive: true });
  fs.copyFileSync(path.join(DRIZZLE, "0000_init.sql"), path.join(folder, "0000_init.sql"));
  const journal = JSON.parse(fs.readFileSync(path.join(DRIZZLE, "meta", "_journal.json"), "utf8"));
  journal.entries = journal.entries.filter((e: { tag: string }) => e.tag === "0000_init");
  fs.writeFileSync(path.join(folder, "meta", "_journal.json"), JSON.stringify(journal));
  return folder;
}

describe("migration 0001", () => {
  it("keeps existing tasks, labels and links, and adds empty tables", () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "migration-test-"));
    const file = path.join(tmp, "app.db");

    // A database on the old schema, with data in it.
    const old = new Database(file);
    old.pragma("foreign_keys = ON");
    migrate(drizzle(old), { migrationsFolder: initOnlyFolder(tmp) });
    old.exec(`
      INSERT INTO labels (id, name, color) VALUES (1, 'Bug', '#e5484d'), (2, 'Docs', '#5e6ad2');
      INSERT INTO tasks (id, title, description, status, priority, due_date, position, created_at, updated_at)
        VALUES (1, 'One', 'first', 'todo', 'high', '2026-09-24', 0, 1000, 2000),
               (2, 'Two', '', 'done', 'none', NULL, 0, 3000, 4000);
      INSERT INTO task_labels (task_id, label_id) VALUES (1, 1), (1, 2), (2, 2);
    `);
    const dump = (db: Database.Database) => ({
      tasks: db.prepare("SELECT * FROM tasks ORDER BY id").all(),
      labels: db.prepare("SELECT * FROM labels ORDER BY id").all(),
      taskLabels: db.prepare("SELECT * FROM task_labels ORDER BY task_id, label_id").all(),
    });
    const before = dump(old);
    old.close();

    // Opening it with the app runs the pending migration.
    const db = createDb(file);
    const raw = db.$client;
    expect(dump(raw)).toEqual(before);
    expect(raw.prepare("SELECT count(*) AS n FROM comments").get()).toEqual({ n: 0 });
    expect(raw.prepare("SELECT count(*) AS n FROM task_activity").get()).toEqual({ n: 0 });
    expect(getTimeline(1, db)).toEqual([]);
    expect(getTimeline(2, db)).toEqual([]);
    raw.close();
  });
});
