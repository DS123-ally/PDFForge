import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createPdfBytes, createTextPdfBytes } from "../fixtures/pdf";

test("rotates selected PDF pages locally", async ({ page }) => {
  const sourcePdf = await createPdfBytes({ pageCount: 2 });
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/tools/rotate-pdf");
  await addPdfFile(page, "source.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("radio", { name: "Custom pages" }).check();
  await page.getByPlaceholder("Example: 1-3, 5").fill("2");
  await page.getByLabel("Rotation").selectOption("90");
  await page.getByRole("button", { name: "Rotate PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("source-rotated.pdf");
  expect(
    output.getPages().map((pdfPage) => pdfPage.getRotation().angle),
  ).toEqual([0, 90]);
  expect(leakedRequests).toEqual([]);
});

test("views metadata without creating an output file", async ({ page }) => {
  const sourcePdf = await createTextPdfBytes();

  await page.goto("/tools/view-metadata");
  await addPdfFile(page, "metadata.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "View metadata" }).click();

  await expect(page.getByRole("heading", { name: "Metadata" })).toBeVisible();
  await expect(page.getByText("Sample title")).toBeVisible();
  await expect(page.getByText("PDFForge tester")).toBeVisible();
});

test("removes common metadata from the downloaded PDF", async ({ page }) => {
  const sourcePdf = await createTextPdfBytes();

  await page.goto("/tools/remove-metadata");
  await addPdfFile(page, "metadata.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Remove metadata" }).click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("metadata-metadata-cleaned.pdf");
  expect(output.getTitle()).toBe("");
  expect(output.getAuthor()).toBe("");
});

test("extracts selectable text locally", async ({ page }) => {
  const sourcePdf = await createTextPdfBytes("Invoice number ABC-123");

  await page.goto("/tools/extract-text");
  await addPdfFile(page, "invoice.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Extract text" }).click();

  await expect(
    page.getByRole("heading", { name: "Extracted text" }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("Invoice number ABC-123")).toBeVisible();
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
