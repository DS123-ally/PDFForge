import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("renders a selected PDF preview", async ({ page }) => {
  const pdf = await PDFDocument.create();
  pdf.addPage([320, 420]);
  const bytes = await pdf.save();

  await page.goto("/tools/merge-pdf");
  await page.locator("input[type='file']").setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: "application/pdf",
    name: "preview.pdf",
  });

  await expect(
    page.getByRole("heading", { name: "preview.pdf" }),
  ).toBeVisible();
  await expect(page.getByText("1 page")).toBeVisible();
  await expect(page.getByLabel("Rendered PDF page 1")).toBeVisible();

  await page.getByRole("button", { name: "Prepare PDFs" }).click();
  await expect(
    page.getByRole("heading", { name: "Files are ready" }),
  ).toBeVisible();
  await expect(
    page.getByText("Files are ready for local processing"),
  ).toBeVisible();
  await expect(page.getByText("Pages")).toBeVisible();
});
