import { expect, test } from "@playwright/test";

test("compress PDF shows both fidelity modes before a file is chosen", async ({
  page,
}) => {
  await page.goto("/tools/compress-pdf");

  await expect(
    page.getByRole("heading", { level: 1, name: "Compress PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lossless rewrite", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Page pictures", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compress PDF" }).first(),
  ).toBeDisabled();
});
