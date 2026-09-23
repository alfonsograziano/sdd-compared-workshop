import { expect, test, type Page } from "@playwright/test";

// Seeded tasks, each used by one test so the tests do not step on each other.
const COMMENT_TASK = "Add CSV export to the reports page";
const ACTIVITY_TASK = "Redesign the empty state for new workspaces"; // priority Medium in the seed
const COUNT_TASK = "Keyboard shortcuts cheat sheet";

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

test("a priority change shows up in the timeline", async ({ page }) => {
  await openTask(page, ACTIVITY_TASK);
  const activity = page.getByRole("list", { name: "Timeline" }).getByTestId("timeline-activity");
  await expect(activity.first()).toContainText("created the task");

  await page.getByRole("combobox", { name: "Priority" }).selectOption("urgent");
  await expect(activity.last()).toContainText("changed priority from Medium to Urgent");
  await page.reload();
  await expect(activity.last()).toContainText("changed priority from Medium to Urgent");
});

test("board cards and list rows show how many comments a task has", async ({ page }) => {
  await page.goto("/");
  await expect(card(page, COUNT_TASK).getByTestId("comment-count")).toHaveCount(0);

  await openTask(page, COUNT_TASK);
  await page.getByLabel("New comment").fill("First thought");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByTestId("timeline-comment")).toHaveCount(1);

  await page.goto("/");
  await expect(card(page, COUNT_TASK).getByTestId("comment-count")).toHaveText("1");
  await expect(card(page, COUNT_TASK).getByLabel("1 comment")).toBeVisible();

  await page.goto("/list");
  const row = page.getByRole("row").filter({ hasText: COUNT_TASK });
  await expect(row.getByTestId("comment-count")).toHaveText("1");
  const quiet = page.getByRole("row").filter({ hasText: ACTIVITY_TASK });
  await expect(quiet.getByTestId("comment-count")).toHaveCount(0);
});
