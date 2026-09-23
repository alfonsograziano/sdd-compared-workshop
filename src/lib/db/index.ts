import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * Opens a SQLite database and applies any pending migrations.
 * Pass ":memory:" to get a throwaway database (used by the tests).
 */
export function createDb(file: string) {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export function databasePath() {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
}

const globalForDb = globalThis as unknown as { db?: Db };

/** The app's shared database connection, created on first use. */
export function getDb(): Db {
  globalForDb.db ??= createDb(databasePath());
  return globalForDb.db;
}
