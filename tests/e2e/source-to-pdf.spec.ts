import { expect, test } from "@playwright/test";

const pages = [
  ["/tools/word-to-pdf", "Text fidelity"],
  ["/tools/excel-to-pdf", "Cell fidelity"],
  ["/tools/powerpoint-to-pdf", "Slide-text fidelity"],
  ["/tools/markdown-to-pdf", "Text fidelity"],
  ["/tools/csv-to-pdf", "Table fidelity"],
];

test("source converters show their fidelity before a local PDF is created", async ({
  page,
}) => {
  for (const [path, label] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Fidelity", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: label, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create PDF" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create PDF" }).first(),
    ).toBeDisabled();
  }
});
