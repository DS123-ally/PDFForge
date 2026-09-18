import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";

import { createTextPdfBytes } from "../fixtures/pdf";

test.describe.configure({ timeout: 60_000 });

test("converts a PDF to HTML locally without uploading", async ({ page }) => {
  const leakedRequests: string[] = [];
  const sourcePdf = await createTextPdfBytes("CONVERT-HTML-TOKEN");

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#pdf-to-html");
  await addPdfFile(page, "notes.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Convert locally" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your file is ready" }),
  ).toBeVisible({ timeout: 30_000 });

  const download = await downloadBytes(page, "Download HTML");

  expect(download.filename).toBe("notes-html.html");
  expect(download.bytes.toString("utf8")).toContain("CONVERT-HTML-TOKEN");
  expect(leakedRequests).toEqual([]);
});

test("converts a PDF to Word locally", async ({ page }) => {
  const sourcePdf = await createTextPdfBytes("CONVERT-WORD-TOKEN");

  await page.goto("/workspace#pdf-to-word");
  await addPdfFile(page, "brief.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Convert locally" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your file is ready" }),
  ).toBeVisible({ timeout: 30_000 });

  const download = await downloadBytes(page, "Download Word file");
  const zip = await JSZip.loadAsync(download.bytes);
  const xml = await zip.file("word/document.xml")?.async("string");

  expect(download.filename).toBe("brief-word.docx");
  expect(xml).toContain("CONVERT-WORD-TOKEN");
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
