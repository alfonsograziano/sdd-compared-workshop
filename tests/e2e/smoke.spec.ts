import { expect, test, type Locator, type Page } from "@playwright/test";

const TITLE = `Smoke test task ${Date.now()}`;

function column(page: Page, status: string) {
  return page.getByTestId(`column-${status}`);
}

function card(scope: Page | Locator, title: string) {
  return scope.getByTestId("task-card").filter({ hasText: title });
}

/** dnd-kit listens to pointer events, so drag with small mouse steps. */
async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + 40, { steps: 20 });
  await page.mouse.up();
}

test("create a task, move it, change its priority and filter for it", async ({ page }) => {
  await page.goto("/");
  await expect(card(page, "Login page crashes on Safari 17")).toBeVisible();

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
  await page.getByRole("combobox", { name: "Priority" }).selectOption("urgent");
  await expect(page.getByText("Saving…")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Priority" })).toHaveValue("urgent");

  // Back on the board, filter by priority and search the title.
  await page.goto("/");
  await page.getByRole("combobox", { name: "Filter by priority" }).selectOption("urgent");
  await expect(page).toHaveURL(/priority=urgent/);
  await expect(card(page, TITLE)).toBeVisible();
  await expect(card(page, "Write the API rate limits guide")).toBeHidden();

  await page.getByLabel("Search titles").fill("smoke test");
  await expect(page).toHaveURL(/q=smoke/);
  await expect(page.getByTestId("task-card")).toHaveCount(1);
});
