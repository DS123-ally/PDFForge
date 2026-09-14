import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import { createPdfBytes, createPngBytes } from "../fixtures/pdf";

test("creates a local PDF from selected images", async ({ page }) => {
  const image = createPngBytes();
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("PNG")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#images-to-pdf");
  await page.locator("input[type='file']").setInputFiles([
    {
      buffer: image,
      mimeType: "image/png",
      name: "first.png",
    },
    {
      buffer: image,
      mimeType: "image/png",
      name: "second.png",
    },
  ]);

  await expect(page.getByText("2 files ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Page size").selectOption("letter");
  await page.getByLabel("Orientation").selectOption("landscape");
  await page.getByRole("button", { name: "Create PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your image PDF is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download PDF");
  const outputPdf = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("first-combined.pdf");
  expect(outputPdf.getPageCount()).toBe(2);
  expect(outputPdf.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
  expect(leakedRequests).toEqual([]);
});

test("exports selected PDF pages to images and downloads a ZIP", async ({
  page,
}) => {
  const sourcePdf = await createPdfBytes({ pageCount: 3 });
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#pdf-to-images");
  await page.locator("input[type='file']").setInputFiles({
    buffer: Buffer.from(sourcePdf),
    mimeType: "application/pdf",
    name: "source.pdf",
  });
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("radio", { name: "Custom pages" }).check();
  await page.getByLabel("Page ranges").fill("1-2");
  await page.getByLabel("Format").selectOption("jpg");
  await page.getByLabel("Resolution").selectOption("1");
  await page.getByRole("button", { name: "Export images" }).click();
  await expect(
    page.getByRole("heading", { name: "Your images are ready" }),
  ).toBeVisible({ timeout: 20_000 });

  const download = await downloadBytes(page, "Download all as ZIP");
  const zip = await JSZip.loadAsync(download.bytes);

  expect(download.filename).toBe("source-images.zip");
  expect(Object.keys(zip.files).sort()).toEqual([
    "source-page-1.jpg",
    "source-page-2.jpg",
  ]);
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
