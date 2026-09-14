import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createTextPdfBytes } from "../fixtures/pdf";

test.describe.configure({ timeout: 60_000 });

test("protects a PDF with AES-256 and unlocks it locally", async ({ page }) => {
  const sourcePdf = await createTextPdfBytes("Invoice number ABC-123");
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#password-protect-pdf");
  await addPdfFile(page, "invoice.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Open password").fill("test-pass-123");
  await page.getByLabel("Confirm password").fill("test-pass-123");
  await page.getByRole("button", { exact: true, name: "Protect PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible();

  const protectedDownload = await downloadBytes(page, "Download PDF");
  await expect(PDFDocument.load(protectedDownload.bytes)).rejects.toThrow(
    /encrypted/i,
  );
  expect(protectedDownload.filename).toBe("invoice-protected.pdf");

  await page.goto("/workspace#unlock-pdf");
  await addPdfFile(page, "invoice-protected.pdf", protectedDownload.bytes);
  await expect(page.getByText("Password protected")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("PDF password").fill("test-pass-123");
  await page.getByRole("button", { exact: true, name: "Unlock PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible();

  const unlocked = await downloadBytes(page, "Download PDF");
  const readable = await PDFDocument.load(unlocked.bytes);
  expect(unlocked.filename).toBe("invoice-protected-unlocked.pdf");
  expect(readable.getPageCount()).toBe(1);
  expect(leakedRequests).toEqual([]);
});

test("redacts selected content so it cannot be recovered from the text layer", async ({
  page,
}) => {
  const sourcePdf = await createTextPdfBytes("SECRET-TOKEN visible text");

  await page.goto("/workspace#redact-pdf");
  await addPdfFile(page, "secret.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Left %").fill("0");
  await page.getByLabel("Top %").fill("0");
  await page.getByLabel("Width %").fill("100");
  await page.getByLabel("Height %").fill("100");
  await page.getByRole("button", { name: "Add region" }).click();
  await page.getByRole("button", { exact: true, name: "Redact PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible({
    timeout: 30_000,
  });

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("secret-redacted.pdf");
  expect(download.bytes.toString("latin1")).not.toContain("SECRET-TOKEN");
  expect(output.getPageCount()).toBe(1);
});

test("flattens form fields in a local PDF", async ({ page }) => {
  const sourcePdf = await createFormPdfBytes();

  await page.goto("/workspace#flatten-pdf");
  await addPdfFile(page, "form.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { exact: true, name: "Flatten PDF" }).click();
  await expect(
    page.getByRole("heading", { name: "Your PDF is ready" }),
  ).toBeVisible();

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("form-flattened.pdf");
  expect(output.getForm().getFields()).toHaveLength(0);
});

async function addPdfFile(
  page: Page,
  name: string,
  bytes: Uint8Array | Buffer,
) {
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

async function createFormPdfBytes() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([320, 420]);
  const form = pdf.getForm();
  const field = form.createTextField("account");
  field.setText("FORM-SECRET");
  field.addToPage(page, { height: 24, width: 180, x: 40, y: 300 });
  return pdf.save();
}
