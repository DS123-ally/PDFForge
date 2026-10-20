import { expect, test } from "@playwright/test";

test("crop PDF shows both fidelity modes before a file is chosen", async ({
  page,
}) => {
  await page.goto("/tools/crop-pdf");

  await expect(
    page.getByRole("heading", { level: 1, name: "Crop PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Page boxes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Page pictures", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What stays in this browser" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crop PDF" }).first(),
  ).toBeDisabled();
});
