import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createPngBytes } from "../fixtures/pdf";

test("imports a gallery photo and builds a local scan PDF", async ({
  page,
}) => {
  const image = createPngBytes();
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("PNG")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#scan-document");
  await expect(
    page.getByRole("heading", { name: "Camera or photos to a clean PDF" }),
  ).toBeVisible();
  await page.getByTestId("scan-gallery-input").setInputFiles({
    buffer: image,
    mimeType: "image/png",
    name: "desk-photo.png",
  });
  await expect(
    page.getByRole("heading", { name: "Pages in this scan" }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("checkbox", { name: /on-device OCR/i }).uncheck();
  await page
    .getByRole("button", { name: "Create scanned PDF" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your scan PDF is ready" }),
  ).toBeVisible({ timeout: 30_000 });

  const download = await downloadBytes(page, "Download PDF");
  const outputPdf = await PDFDocument.load(download.bytes);

  expect(download.filename).toMatch(/desk-photo-scan\.pdf$/);
  expect(outputPdf.getPageCount()).toBe(1);
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
