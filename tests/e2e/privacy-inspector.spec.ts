import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createTextPdfBytes } from "../fixtures/pdf";

test("scans a PDF and writes a sanitized local copy", async ({ page }) => {
  const leakedRequests: string[] = [];
  const sourcePdf = await createTextPdfBytes("Visible invoice");

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#privacy-inspector");
  await addPdfFile(page, "leaky.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Scan PDF" }).first().click();
  await expect(page.getByRole("heading", { name: "Scan report" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Standard metadata")).toBeVisible();
  await expect(
    page.getByText(/does not prove the file is empty/i),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sanitize PDF" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your sanitized PDF is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("leaky-sanitized.pdf");
  expect(output.getTitle()).toBe("");
  expect(output.getAuthor()).toBe("");
  expect(leakedRequests).toEqual([]);
});

async function addPdfFile(page: Page, name: string, bytes: Uint8Array) {
  await page.locator("input[type='file']").setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: "application/pdf",
    name,
  });
}

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
