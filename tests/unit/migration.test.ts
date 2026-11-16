import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";

const MIGRATIONS = path.join(process.cwd(), "drizzle");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A migrations folder that holds only the first migration, as the database looked on master. */
function initOnlyFolder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrations-"));
  tempDirs.push(dir);
  const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS, "meta/_journal.json"), "utf8"));
  const first = journal.entries[0];
  fs.mkdirSync(path.join(dir, "meta"));
  fs.writeFileSync(path.join(dir, "meta/_journal.json"), JSON.stringify({ ...journal, entries: [first] }));
  fs.copyFileSync(path.join(MIGRATIONS, `${first.tag}.sql`), path.join(dir, `${first.tag}.sql`));
  return dir;
}

describe("comments and activity migration", () => {
  it("keeps existing data and backfills one created entry per task at its creation time", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: initOnlyFolder() });

    // Data as it exists before the migration.
    sqlite.exec(`
      INSERT INTO labels (id, name, color) VALUES (1, 'Bug', '#f00'), (2, 'Docs', '#ff0');
      INSERT INTO tasks (id, title, description, status, priority, due_date, position, created_at, updated_at) VALUES
        (1, 'One', 'first', 'todo', 'high', '2026-09-24', 0, 1700000000000, 1700000500000),
        (2, 'Two', '', 'done', 'none', NULL, 0, 1710000000000, 1710000000000),
        (5, 'Five', 'x', 'todo', 'low', NULL, 1, 1720000000123, 1720000000123);
      INSERT INTO task_labels (task_id, label_id) VALUES (1, 1), (1, 2), (5, 2);
    `);
    const before = {
      tasks: sqlite.prepare("SELECT * FROM tasks ORDER BY id").all(),
      labels: sqlite.prepare("SELECT * FROM labels ORDER BY id").all(),
      links: sqlite.prepare("SELECT * FROM task_labels ORDER BY task_id, label_id").all(),
    };

    migrate(db, { migrationsFolder: MIGRATIONS });

    expect(sqlite.prepare("SELECT * FROM tasks ORDER BY id").all()).toEqual(before.tasks);
    expect(sqlite.prepare("SELECT * FROM labels ORDER BY id").all()).toEqual(before.labels);
    expect(sqlite.prepare("SELECT * FROM task_labels ORDER BY task_id, label_id").all()).toEqual(before.links);

    expect(
      sqlite.prepare("SELECT task_id, field, old_value, new_value, created_at FROM task_activity ORDER BY task_id").all(),
    ).toEqual([
      { task_id: 1, field: null, old_value: null, new_value: null, created_at: 1700000000000 },
      { task_id: 2, field: null, old_value: null, new_value: null, created_at: 1710000000000 },
      { task_id: 5, field: null, old_value: null, new_value: null, created_at: 1720000000123 },
    ]);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM comments").get()).toEqual({ n: 0 });

    // Running the migrations again changes nothing.
    migrate(db, { migrationsFolder: MIGRATIONS });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM task_activity").get()).toEqual({ n: 3 });
  });
});
