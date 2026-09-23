import { createDb, databasePath } from "../src/lib/db";

// createDb applies every pending migration in ./drizzle.
createDb(databasePath());
console.log(`Database is up to date: ${databasePath()}`);
