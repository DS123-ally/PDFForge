import { expect, test } from "@playwright/test";

test("repair PDF shows both fidelity modes before a file is chosen", async ({
  page,
}) => {
  await page.goto("/tools/repair-pdf");

  await expect(
    page.getByRole("heading", { level: 1, name: "Repair PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rebuild pages", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recover pictures", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Repair PDF" }).first(),
  ).toBeDisabled();
});
