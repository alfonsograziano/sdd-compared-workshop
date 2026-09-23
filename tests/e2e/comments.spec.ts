import { expect, test, type Page } from "@playwright/test";

// Seeded tasks, each used by one test so the tests do not step on each other.
const COMMENT_TASK = "Add CSV export to the reports page";

function card(page: Page, title: string) {
  return page.getByTestId("task-card").filter({ hasText: title });
}

async function openTask(page: Page, title: string) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await card(page, title).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");
}

test("add, edit and delete a comment", async ({ page }) => {
  await openTask(page, COMMENT_TASK);
  const timeline = page.getByRole("list", { name: "Timeline" });
  const comments = timeline.getByTestId("timeline-comment");
  const submit = page.getByRole("button", { name: "Comment", exact: true });

  // An empty comment is rejected and says why.
  await page.getByLabel("New comment").fill("   ");
  await submit.click();
  await expect(page.getByText("Comment cannot be empty")).toBeVisible();
  await expect(comments).toHaveCount(0);

  // Add: markdown renders.
  await page.getByLabel("New comment").fill("Needs **review**");
  await submit.click();
  await expect(comments).toHaveCount(1);
  await expect(comments.first().locator("strong", { hasText: "review" })).toBeVisible();
  await expect(page.getByLabel("New comment")).toHaveValue("");
  await expect(comments.first().getByText("edited")).toHaveCount(0);

  // Edit: new text, marked as edited, and it survives a reload.
  await comments.first().getByRole("button", { name: "Edit comment" }).click();
  await comments.first().getByRole("textbox", { name: "Edit comment" }).fill("Needs **two** reviews");
  await comments.first().getByRole("button", { name: "Save" }).click();
  await expect(comments.first().locator("strong", { hasText: "two" })).toBeVisible();
  await expect(comments.first().getByText("edited", { exact: true })).toBeVisible();
  await page.reload();
  await expect(comments).toHaveCount(1);
  await expect(comments.first()).toContainText("Needs two reviews");
  await expect(comments.first().getByText("edited", { exact: true })).toBeVisible();

  // Delete, after confirming.
  await page.waitForLoadState("networkidle");
  page.once("dialog", (dialog) => dialog.accept());
  await comments.first().getByRole("button", { name: "Delete comment" }).click();
  await expect(comments).toHaveCount(0);
  await page.reload();
  await expect(comments).toHaveCount(0);
});
