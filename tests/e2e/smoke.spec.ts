import { expect, test } from "@playwright/test";
import { card, column, drag } from "./helpers";

const TITLE = `Smoke test task ${Date.now()}`;

test("create a task, move it, change its priority and filter for it", async ({ page }) => {
  await page.goto("/");
  await expect(card(page, "Login page crashes on Safari 17")).toBeVisible();
  // Wait for hydration, so the keyboard shortcut and drag handlers are attached.
  await page.waitForLoadState("networkidle");

  // Create with the "c" shortcut. New tasks land in Todo.
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title").fill(TITLE);
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
  await expect(card(column(page, "todo"), TITLE)).toBeVisible();

  // Drag it to In Progress, and check the move survives a reload.
  await drag(page, card(page, TITLE), column(page, "in_progress"));
  await expect(card(column(page, "in_progress"), TITLE)).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(card(column(page, "in_progress"), TITLE)).toBeVisible();

  // Open it and change the priority.
  await card(page, TITLE).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("combobox", { name: "Priority" }).selectOption("urgent");
  await expect(page.getByText("Saving…")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Priority" })).toHaveValue("urgent");

  // Back on the board, filter by priority and search the title.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("combobox", { name: "Filter by priority" }).selectOption("urgent");
  await expect(page).toHaveURL(/priority=urgent/);
  await expect(card(page, TITLE)).toBeVisible();
  await expect(card(page, "Write the API rate limits guide")).toBeHidden();

  await page.getByLabel("Search titles").fill("smoke test");
  await expect(page).toHaveURL(/q=smoke/);
  await expect(page.getByTestId("task-card")).toHaveCount(1);
});
