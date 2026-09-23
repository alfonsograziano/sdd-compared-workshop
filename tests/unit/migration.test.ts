import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";

const DRIZZLE = path.join(process.cwd(), "drizzle");
let dir: string | undefined;

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

/** A migrations folder that holds only the first migration, like the database on master. */
function initOnlyFolder() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrations-"));
  fs.mkdirSync(path.join(dir, "meta"));
  const journal = JSON.parse(fs.readFileSync(path.join(DRIZZLE, "meta", "_journal.json"), "utf8"));
  const first = journal.entries[0];
  fs.writeFileSync(path.join(dir, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: [first] }));
  fs.copyFileSync(path.join(DRIZZLE, `${first.tag}.sql`), path.join(dir, `${first.tag}.sql`));
  return dir;
}

describe("comments_and_activity migration", () => {
  it("keeps existing rows and backfills one created entry per task", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: initOnlyFolder() });

    sqlite.exec(`
      INSERT INTO labels (name, color) VALUES ('Bug', '#f00'), ('Docs', '#ff0');
      INSERT INTO tasks (title, description, status, priority, due_date, position, created_at, updated_at)
        VALUES ('A', 'desc', 'todo', 'high', '2026-09-24', 0, 1000, 2000),
               ('B', '', 'done', 'none', NULL, 1, 3000, 4000);
      INSERT INTO task_labels (task_id, label_id) VALUES (1, 1), (1, 2), (2, 2);
    `);
    const dump = () => ({
      tasks: sqlite.prepare("SELECT * FROM tasks ORDER BY id").all(),
      labels: sqlite.prepare("SELECT * FROM labels ORDER BY id").all(),
      taskLabels: sqlite.prepare("SELECT * FROM task_labels ORDER BY task_id, label_id").all(),
    });
    const before = dump();

    migrate(db, { migrationsFolder: DRIZZLE });

    expect(dump()).toEqual(before);
    expect(sqlite.prepare("SELECT task_id, field, from_value, to_value, created_at FROM activities ORDER BY id").all()).toEqual([
      { task_id: 1, field: "created", from_value: null, to_value: null, created_at: 1000 },
      { task_id: 2, field: "created", from_value: null, to_value: null, created_at: 3000 },
    ]);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM comments").get()).toEqual({ n: 0 });
  });
});
