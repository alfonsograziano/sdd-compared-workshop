import { expect, test } from "@playwright/test";

// A seeded task with Medium priority and no comments.
const TITLE = "Keyboard shortcuts cheat sheet";

test("comment on a task, edit and delete it, and see activity and counts", async ({ page }) => {
  await page.goto("/list");
  await page.getByRole("link", { name: TITLE }).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");

  const timeline = page.getByRole("region", { name: "Activity" });
  const comments = timeline.getByTestId("comment");
  await expect(timeline.getByTestId("activity-entry").first()).toContainText("created the task");

  // Add two comments. Markdown is rendered.
  const box = page.getByLabel("New comment");
  await box.fill("First **comment**");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(comments).toHaveCount(1);
  await expect(comments.first().locator("strong")).toHaveText("comment");
  await expect(box).toHaveValue("");

  await box.fill("Second comment");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(comments).toHaveCount(2);
  await expect(comments.last()).toContainText("Second comment");

  // Edit the first one. It stays first and is marked as edited.
  const first = comments.filter({ hasText: "First" });
  await expect(first.getByTestId("comment-edited")).toHaveCount(0);
  await first.getByRole("button", { name: "Edit" }).click();
  await first.getByLabel("Edit comment").fill("First comment, fixed");
  await first.getByRole("button", { name: "Save" }).click();
  await expect(comments.first()).toContainText("First comment, fixed");
  await expect(comments.first().getByTestId("comment-edited")).toBeVisible();

  // Delete the second one.
  page.once("dialog", (dialog) => dialog.accept());
  await comments.filter({ hasText: "Second comment" }).getByRole("button", { name: "Delete" }).click();
  await expect(comments).toHaveCount(1);

  // Change the priority and see the activity entry at the end of the timeline.
  await page.getByRole("combobox", { name: "Priority" }).selectOption("urgent");
  await expect(timeline.getByTestId("activity-entry").last()).toContainText("changed priority from Medium to Urgent");

  // Everything is still there after a reload.
  await page.reload();
  await expect(comments).toHaveCount(1);
  await expect(timeline.getByTestId("activity-entry").last()).toContainText("changed priority from Medium to Urgent");

  // The board card and the list row show the comment count; tasks without comments show none.
  await page.goto("/");
  const card = page.getByTestId("task-card").filter({ hasText: TITLE });
  await expect(card.getByTestId("comment-count")).toHaveText("1");
  await expect(
    page.getByTestId("task-card").filter({ hasText: "Write the API rate limits guide" }).getByTestId("comment-count"),
  ).toHaveCount(0);

  await page.goto("/list");
  const row = page.getByTestId("task-row").filter({ hasText: TITLE });
  await expect(row.getByTestId("comment-count")).toHaveText("1");
  await expect(
    page.getByTestId("task-row").filter({ hasText: "Write the API rate limits guide" }).getByTestId("comment-count"),
  ).toHaveCount(0);
});
