import { expect, test } from "@playwright/test";

const pages = [
  ["/tools/word-to-pdf", "Fonts, images, headers"],
  ["/tools/excel-to-pdf", "cached value stored in the file"],
  ["/tools/powerpoint-to-pdf", "slide design are not reconstructed"],
  ["/tools/markdown-to-pdf", "Images are skipped"],
  ["/tools/csv-to-pdf", "The first row is the header"],
];

test("source converters show their fidelity before a local PDF is created", async ({
  page,
}) => {
  for (const [path, detail] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Fidelity", { exact: true })).toBeVisible();
    await expect(page.getByText(detail)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create PDF" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create PDF" }).first(),
    ).toBeDisabled();
  }
});
