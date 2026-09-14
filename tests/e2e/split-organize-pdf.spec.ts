import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import { createPdfBytes } from "../fixtures/pdf";

test("splits selected ranges into a local ZIP download", async ({ page }) => {
  const sourcePdf = await createPdfBytes({ pageCount: 5 });
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#split-pdf");
  await addPdfFile(page, "source.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible();

  await page.getByRole("radio", { name: /split by ranges/i }).check();
  await page.getByLabel("Page ranges").fill("1-2, 4");
  await page.getByRole("button", { name: "Split PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your split output is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download ZIP");
  const zip = await JSZip.loadAsync(download.bytes);

  expect(download.filename).toBe("source-split.zip");
  expect(Object.keys(zip.files).sort()).toEqual([
    "source-pages-1-2.pdf",
    "source-pages-4.pdf",
  ]);
  expect(leakedRequests).toEqual([]);
});

test("organizes pages with keyboard controls and saves a local PDF", async ({
  page,
}) => {
  const sourcePdf = await createPdfBytes({
    sizes: [
      [200, 300],
      [400, 500],
      [600, 700],
    ],
  });

  await page.goto("/workspace#organize-pdf");
  await addPdfFile(page, "source.pdf", sourcePdf);
  await expect(page.getByText(/3 pages will be saved/)).toBeVisible();

  await page.getByRole("button", { name: "Move page 1 down" }).click();
  await page.getByRole("button", { name: "Rotate page 1" }).click();
  await page.getByRole("button", { name: "Delete page 3" }).click();
  await expect(page.getByText(/2 pages will be saved/)).toBeVisible();

  await page.getByRole("button", { name: "Save organized PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your organized PDF is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download organized PDF");
  const outputPdf = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("source-organized.pdf");
  expect(outputPdf.getPageCount()).toBe(2);
  expect(outputPdf.getPages().map((pdfPage) => pdfPage.getSize())).toEqual([
    { width: 400, height: 500 },
    { width: 200, height: 300 },
  ]);
  expect(
    outputPdf.getPages().map((pdfPage) => pdfPage.getRotation().angle),
  ).toEqual([0, 90]);
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
