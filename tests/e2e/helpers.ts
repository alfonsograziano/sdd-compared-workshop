import type { Locator, Page } from "@playwright/test";

export function column(page: Page, status: string) {
  return page.getByTestId(`column-${status}`);
}

export function card(scope: Page | Locator, title: string) {
  return scope.getByTestId("task-card").filter({ hasText: title });
}

/** dnd-kit listens to pointer events, so drag with small mouse steps. */
export async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, { steps: 5 });
  await page.mouse.move(b.x + b.width / 2, b.y + 40, { steps: 20 });
  await page.mouse.up();
}
