import { createDb, databasePath } from "../src/lib/db";
import { seed } from "../src/lib/seed";

const result = seed(createDb(databasePath()));
console.log(`Seeded ${result.tasks} tasks and ${result.labels} labels into ${databasePath()}`);
