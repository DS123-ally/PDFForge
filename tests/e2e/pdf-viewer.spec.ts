import { expect, test } from "@playwright/test";

import { createPdfBytes } from "../fixtures/pdf";

test("renders a selected PDF preview", async ({ page }) => {
  const pdf = await createPdfBytes({ pageCount: 1 });

  await page.goto("/tools/merge-pdf");
  await page.locator("input[type='file']").setInputFiles([
    {
      buffer: Buffer.from(pdf),
      mimeType: "application/pdf",
      name: "first.pdf",
    },
  ]);

  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: "first.pdf" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("1 page")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Rendered PDF page 1")).toBeVisible();
});
