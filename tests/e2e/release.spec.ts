import { expect, test } from "@playwright/test";

test("describes supported browsers for release", async ({ page }) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: "Supported browsers" }),
  ).toBeVisible();
  await expect(
    page.getByText(/current Chromium, Firefox, and WebKit/i),
  ).toBeVisible();
});
