import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createPdfBytes } from "../fixtures/pdf";

test.describe.configure({ timeout: 60_000 });

test("chains merge and page numbers, then saves settings without the PDF", async ({
  page,
}) => {
  const leakedRequests: string[] = [];
  const firstPdf = await createPdfBytes({ pageCount: 1 });
  const secondPdf = await createPdfBytes({ pageCount: 2 });

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#private-recipes");
  await page.locator("input[type='file']").setInputFiles([
    {
      buffer: Buffer.from(firstPdf),
      mimeType: "application/pdf",
      name: "first.pdf",
    },
    {
      buffer: Buffer.from(secondPdf),
      mimeType: "application/pdf",
      name: "second.pdf",
    },
  ]);
  await expect(page.getByText("2 files ready")).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByLabel("Step to add").selectOption("add-page-numbers");
  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByRole("button", { name: "Run recipe" }).click();
  await expect(
    page.getByRole("heading", { name: "Your recipe PDF is ready" }),
  ).toBeVisible({ timeout: 30_000 });

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("first-recipe.pdf");
  expect(output.getPageCount()).toBe(3);

  await page.getByLabel("Save recipe settings on this device").check();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("button", { name: "Load" })).toBeVisible();

  const persisted = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) =>
      name.includes("private-recipes"),
    );
    const raw = key ? localStorage.getItem(key) : null;

    return {
      key,
      raw,
      matchingDocumentKeys: Object.keys(localStorage).filter((name) =>
        /pdf|document|file|password|metadata/i.test(name),
      ),
    };
  });

  expect(persisted.key).toBe("forge.private-recipes.v1");
  expect(persisted.matchingDocumentKeys).toEqual([]);
  expect(persisted.raw).toContain("add-page-numbers");
  expect(persisted.raw).not.toContain("%PDF");
  expect(persisted.raw).not.toMatch(/"password"\s*:\s*"/);
  expect(leakedRequests).toEqual([]);
});

async function downloadBytes(page: Page, buttonName: string) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  expect(stream).not.toBeNull();

  for await (const chunk of stream!) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    bytes: Buffer.concat(chunks),
    filename: download.suggestedFilename(),
  };
}
