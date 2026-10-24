import path from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test, type Page } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

import { buildDocx } from "../../src/lib/convert/docx";

test.describe.configure({ timeout: 90_000 });

test("draws a Word page, including its picture, into a local PDF", async ({
  page,
}) => {
  const leakedRequests: string[] = [];
  const docx = await buildDocx(
    [
      {
        height: 792,
        lines: [
          {
            cells: ["College"],
            text: "College Project",
            y: 700,
          },
        ],
        pageNumber: 1,
        png: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
          "base64",
        ),
        width: 612,
      },
    ],
    "college",
  );

  page.on("request", (request) => {
    const url = new URL(request.url());
    const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";

    if (!local || request.method() === "POST") {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/tools/word-to-pdf");
  await expect(
    page.getByRole("heading", { name: "Page fidelity", exact: true }),
  ).toBeVisible();
  await addDocx(page, "college.docx", docx);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Create PDF" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible({ timeout: 60_000 });

  const download = await downloadPdf(page);
  const pdf = await PDFDocument.load(download.bytes);
  const [pdfPage] = pdf.getPages();
  const size = pdfPage?.getSize();

  expect(download.filename).toBe("college-pdf.pdf");
  expect(download.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(download.bytes.toString("latin1")).toContain("/DCTDecode");
  expect(await pdfText(download.bytes)).toContain("College Project");
  expect(size?.width).toBeGreaterThan(500);
  expect(size?.height).toBeGreaterThan(700);
  expect(leakedRequests).toEqual([]);
});

test("keeps saved Word page breaks instead of shrinking all content onto one page", async ({
  page,
}) => {
  const docx = await buildDocx(
    [
      {
        height: 792,
        lines: [
          { cells: ["First section"], text: "First section", y: 700 },
          { cells: ["Second section"], text: "Second section", y: 640 },
        ],
        pageNumber: 1,
        width: 612,
      },
    ],
    "page breaks",
  );
  const zip = await JSZip.loadAsync(docx);
  const document = await zip.file("word/document.xml")?.async("string");
  expect(document).toBeDefined();
  zip.file(
    "word/document.xml",
    document!.replace(
      '<w:t xml:space="preserve">Second section</w:t>',
      '<w:lastRenderedPageBreak/><w:t xml:space="preserve">Second section</w:t>',
    ),
  );

  await page.goto("/tools/word-to-pdf");
  await addDocx(
    page,
    "sections.docx",
    await zip.generateAsync({ type: "uint8array" }),
  );
  await expect(page.getByText("1 file ready")).toBeVisible();
  await page.getByRole("button", { name: "Create PDF" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible({ timeout: 60_000 });

  const { bytes } = await downloadPdf(page);
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  expect(await pdfText(bytes, 1)).toContain("First section");
  expect(await pdfText(bytes, 2)).toContain("Second section");
});

async function addDocx(page: Page, name: string, bytes: Uint8Array) {
  await page.locator("input[type='file']").setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    name,
  });
}

async function downloadPdf(page: Page) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
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

async function pdfText(bytes: Buffer, pageNumber = 1) {
  const task = getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    isEvalSupported: false,
    standardFontDataUrl: `${pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")).href}/`,
    useSystemFonts: false,
  } as Parameters<typeof getDocument>[0]);
  const document = await task.promise;
  const pdfPage = await document.getPage(pageNumber);
  const content = await pdfPage.getTextContent();

  return content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
}
