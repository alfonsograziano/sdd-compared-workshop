import { expect, test, type Page } from "@playwright/test";
import { card, column, drag } from "./helpers";

const TITLE = `Comments test task ${Date.now()}`;

function listRow(page: Page, title: string) {
  return page.getByRole("row").filter({ hasText: title });
}

test("comment on a task, edit and delete it, and see the activity", async ({ page }) => {
  await page.goto("/");
  await expect(card(page, "Login page crashes on Safari 17")).toBeVisible();
  await page.waitForLoadState("networkidle");

  // A fresh task, so the test does not depend on demo data.
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("Title").fill(TITLE);
  await dialog.getByRole("button", { name: "Create task" }).click();
  await expect(dialog).toBeHidden();
  await expect(card(column(page, "todo"), TITLE)).toBeVisible();
  await expect(card(page, TITLE).getByTestId("comment-count")).toHaveCount(0);

  // A board drag to another column shows up as activity.
  await drag(page, card(page, TITLE), column(page, "in_progress"));
  await expect(card(column(page, "in_progress"), TITLE)).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(card(column(page, "in_progress"), TITLE)).toBeVisible();

  await card(page, TITLE).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");
  const timeline = page.getByTestId("timeline");
  await expect(timeline.getByTestId("activity-entry")).toHaveText([
    /created the task/,
    /changed status from Todo to In Progress/,
  ]);

  // A field change shows up as activity.
  await page.getByRole("combobox", { name: "Priority" }).selectOption("high");
  await expect(timeline.getByText("changed priority from No priority to High")).toBeVisible();

  // An empty comment is rejected and the typed text stays.
  const box = page.getByLabel("New comment");
  await box.fill("   ");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("Comment can't be empty")).toBeVisible();
  await expect(box).toHaveValue("   ");

  // Add a markdown comment.
  await box.fill("**hi**");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  const comment = timeline.getByTestId("comment");
  await expect(comment.locator("strong", { hasText: "hi" })).toBeVisible();
  await expect(box).toHaveValue("");
  await expect(comment).not.toContainText("· edited");

  // Edit it.
  await comment.getByRole("button", { name: "Edit" }).click();
  await comment.getByLabel("Edit comment").fill("a changed comment");
  await comment.getByRole("button", { name: "Save" }).click();
  await expect(comment).toContainText("a changed comment");
  await expect(comment).toContainText("· edited");

  // After a reload the timeline keeps the order: created, status change, priority change, comment.
  await page.reload();
  await expect(timeline.locator("> li")).toHaveText([
    /created the task/,
    /changed status from Todo to In Progress/,
    /changed priority from No priority to High/,
    /a changed comment/,
  ]);

  // The board card shows the comment count.
  await page.goto("/");
  await expect(card(page, TITLE).getByTestId("comment-count")).toHaveText("1 comment");

  // So does the list row.
  await page.goto("/list");
  await expect(listRow(page, TITLE).getByTestId("comment-count")).toHaveText("1 comment");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Delete the comment, confirming the browser dialog.
  await card(page, TITLE).click();
  await expect(page).toHaveURL(/\/tasks\/\d+$/);
  await page.waitForLoadState("networkidle");
  page.once("dialog", (d) => d.accept());
  await timeline.getByTestId("comment").getByRole("button", { name: "Delete" }).click();
  await expect(timeline.getByTestId("comment")).toHaveCount(0);
  await page.reload();
  await expect(timeline.getByTestId("comment")).toHaveCount(0);
  await expect(timeline.getByTestId("activity-entry")).toHaveCount(3);

  // The list row no longer shows a count.
  await page.goto("/list");
  await expect(listRow(page, TITLE)).toBeVisible();
  await expect(listRow(page, TITLE).getByTestId("comment-count")).toHaveCount(0);
});
