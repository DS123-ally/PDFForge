import { expect, test } from "@playwright/test";

test("shows the responsive PDFForge homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/PDFForge/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /edit pdfs directly in your browser/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Your documents never leave your device"),
  ).toBeVisible();
});

test("has no horizontal overflow on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(hasOverflow).toBe(false);
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("opens the mobile navigation with the keyboard", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("header")
      .getByRole("button", { name: "Open navigation" })
      .click({ force: true });

    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
