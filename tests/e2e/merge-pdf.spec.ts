import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createEncryptedPdfBytes, createPdfBytes } from "../fixtures/pdf";

test("merges local PDFs in order and does not upload document bytes", async ({
  page,
}) => {
  const firstPdf = await createPdfBytes({ pageCount: 1, size: [200, 300] });
  const secondPdf = await createPdfBytes({ pageCount: 2, size: [400, 500] });
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";
    const url = request.url();

    if (request.method() === "POST") {
      leakedRequests.push(`${request.method()} ${url}`);
    }

    if (body.includes("%PDF") || url.includes("first.pdf")) {
      leakedRequests.push(url);
    }
  });

  await page.goto("/tools/merge-pdf");
  await addPdfFiles(page, [
    { name: "first.pdf", bytes: firstPdf },
    { name: "second.pdf", bytes: secondPdf },
  ]);

  await expect(page.getByText("2 files ready")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/- 1 page$/)).toBeVisible();
  await expect(page.getByText(/- 2 pages$/)).toBeVisible();

  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(
    page.getByRole("heading", { name: "Your merged PDF is ready" }),
  ).toBeVisible();
  await expect(page.getByText("2 files merged into 3 pages.")).toBeVisible();

  const downloadedPdf = await downloadMergedPdf(page, "first-merged.pdf");

  expect(downloadedPdf.getPageCount()).toBe(3);
  expect(downloadedPdf.getPages().map((pdfPage) => pdfPage.getSize())).toEqual([
    { width: 200, height: 300 },
    { width: 400, height: 500 },
    { width: 400, height: 500 },
  ]);
  expect(leakedRequests).toEqual([]);
});

test("keyboard reorder changes the merged page order", async ({ page }) => {
  const firstPdf = await createPdfBytes({ pageCount: 1, size: [200, 300] });
  const secondPdf = await createPdfBytes({ pageCount: 1, size: [400, 500] });

  await page.goto("/tools/merge-pdf");
  await addPdfFiles(page, [
    { name: "first.pdf", bytes: firstPdf },
    { name: "second.pdf", bytes: secondPdf },
  ]);

  await expect(page.getByText("2 files ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Move first.pdf down" }).click();
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(
    page.getByRole("heading", { name: "Your merged PDF is ready" }),
  ).toBeVisible();

  const downloadedPdf = await downloadMergedPdf(page, "second-merged.pdf");

  expect(downloadedPdf.getPages().map((pdfPage) => pdfPage.getSize())).toEqual([
    { width: 400, height: 500 },
    { width: 200, height: 300 },
  ]);
});

test("shows a clear error for password-protected PDFs", async ({ page }) => {
  await page.goto("/tools/merge-pdf");
  await addPdfFiles(page, [
    { name: "locked.pdf", bytes: await createEncryptedPdfBytes() },
  ]);

  await expect(page.getByText("Some files could not be added")).toBeVisible();
  await expect(
    page.getByText("Password-protected PDFs are not supported in this step."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Merge PDFs" })).toBeDisabled();
});

test("process another clears the current merge session", async ({ page }) => {
  const firstPdf = await createPdfBytes({ pageCount: 1 });
  const secondPdf = await createPdfBytes({ pageCount: 1 });

  await page.goto("/tools/merge-pdf");
  await addPdfFiles(page, [
    { name: "first.pdf", bytes: firstPdf },
    { name: "second.pdf", bytes: secondPdf },
  ]);
  await expect(page.getByText("2 files ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(
    page.getByRole("heading", { name: "Your merged PDF is ready" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Process another" }).click();

  await expect(
    page.getByRole("heading", { name: "Your merged PDF is ready" }),
  ).toHaveCount(0);
  await expect(page.getByText("2 files ready")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Merge PDFs" })).toBeDisabled();
});

async function addPdfFiles(
  page: Page,
  files: Array<{ name: string; bytes: Uint8Array }>,
) {
  await page.locator("input[type='file']").setInputFiles(
    files.map((file) => ({
      buffer: Buffer.from(file.bytes),
      mimeType: "application/pdf",
      name: file.name,
    })),
  );
}

async function downloadMergedPdf(page: Page, filename: string) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download merged PDF" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];

  expect(stream).not.toBeNull();
  expect(download.suggestedFilename()).toBe(filename);

  for await (const chunk of stream!) {
    chunks.push(Buffer.from(chunk));
  }

  return PDFDocument.load(Buffer.concat(chunks));
}
