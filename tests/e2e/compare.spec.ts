import { expect, test } from "@playwright/test";

const pages = ["/compare/ilovepdf", "/compare/smallpdf", "/compare/adobe"];

test("shows what each product uploads, with PDFForge processed in the browser", async ({
  page,
}) => {
  for (const path of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const forgeCells = page.locator("tbody td:last-child");
    const count = await forgeCells.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      await expect(forgeCells.nth(index)).toHaveText(
        "processed in the browser",
      );
    }
  }
});

test("comparison tables do not widen a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/compare/adobe");

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(hasOverflow).toBe(false);
});
