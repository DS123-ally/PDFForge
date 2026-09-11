import { expect, test } from "@playwright/test";

test("shows the PDFForge foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/PDFForge/);
  await expect(
    page.getByRole("heading", { level: 1, name: "PDFForge" }),
  ).toBeVisible();
});
