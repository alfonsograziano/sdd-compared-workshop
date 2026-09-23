import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 900 } } }],
  // The e2e run uses its own database, reseeded on every start, so it never touches data/app.db.
  webServer: {
    command: `npm run db:seed && npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { DATABASE_PATH: "data/e2e.db" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
