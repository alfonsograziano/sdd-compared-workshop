import { expect, test, type Page } from "@playwright/test";

const TITLE = `Comments e2e task ${Date.now()}`;

async function createTask(page: Page, title: string) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
}

test("comment on a task, edit and delete it, and see the activity log", async ({ page }) => {
  await createTask(page, TITLE);
  const card = page.getByTestId("task-card").filter({ hasText: TITLE });
  await expect(card).toBeVisible();
  // No comments yet: no count on the card.
  await expect(card.getByTestId("comment-count")).toHaveCount(0);

  await card.click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");
  const timeline = page.getByTestId("timeline");
  await expect(timeline.getByTestId("activity-entry")).toHaveText([/created the task/]);

  // Change the priority and see the entry.
  await page.getByRole("combobox", { name: "Priority" }).selectOption("urgent");
  await expect(timeline.getByText("changed priority from No priority to Urgent")).toBeVisible();

  // An empty comment is refused.
  const box = page.getByLabel("New comment");
  await box.fill("   ");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("Comment can't be empty")).toBeVisible();
  await expect(timeline.getByTestId("comment")).toHaveCount(0);

  // Add two comments. Markdown is rendered, and the newest is last.
  await box.fill("Looks **good**");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  const comments = timeline.getByTestId("comment");
  await expect(comments).toHaveCount(1);
  await expect(comments.first().locator("strong")).toHaveText("good");
  await expect(box).toHaveValue("");
  await box.fill("Second note");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(comments).toHaveCount(2);
  await expect(comments.last()).toContainText("Second note");
  await expect(timeline.locator(":scope > li").last()).toContainText("Second note");
  await expect(comments.first()).not.toContainText("(edited)");

  // Edit the first comment.
  await comments.first().getByRole("button", { name: "Edit comment" }).click();
  await comments.first().getByLabel("Comment text").fill("Looks *great*");
  await comments.first().getByRole("button", { name: "Save" }).click();
  await expect(comments.first().locator("em")).toHaveText("great");
  await expect(comments.first()).toContainText("(edited)");

  // Survives a reload, in time order: created, priority change, then the comments.
  await page.reload();
  await expect(page.getByTestId("timeline").locator(":scope > li")).toHaveText([
    /created the task/,
    /changed priority from No priority to Urgent/,
    /Looks great/,
    /Second note/,
  ]);

  // The count shows on the board and in the list.
  await page.goto("/");
  await expect(card.getByTestId("comment-count")).toHaveText("2");
  await page.goto("/list");
  const row = page.getByRole("row").filter({ hasText: TITLE });
  await expect(row.getByTestId("comment-count")).toHaveText("2");

  // Delete one comment; the count follows.
  await row.getByRole("link", { name: TITLE }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("comment").last().getByRole("button", { name: "Delete comment" }).click();
  await expect(page.getByTestId("comment")).toHaveCount(1);
  await page.goto("/list");
  await expect(page.getByRole("row").filter({ hasText: TITLE }).getByTestId("comment-count")).toHaveText("1");
});
