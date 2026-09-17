import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { createTextPdfBytes } from "../fixtures/pdf";

test.describe.configure({ timeout: 60_000 });

test("scans an email and downloads a redacted copy without leaking the token", async ({
  page,
}) => {
  const leakedRequests: string[] = [];
  const sourcePdf = await createTextPdfBytes(
    "Contact jane.secret@example.com for payroll",
  );

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (request.method() === "POST" || body.includes("%PDF")) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#privacy-risk-scanner");
  await addPdfFile(page, "leaky.pdf", sourcePdf);
  await expect(page.getByText("1 file ready")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("jane.secret@example.com")).toBeVisible({
    timeout: 20_000,
  });
  await page
    .getByRole("button", { name: "Download redacted PDF" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Your redacted PDF is ready" }),
  ).toBeVisible({
    timeout: 30_000,
  });

  const download = await downloadBytes(page, "Download PDF");
  const output = await PDFDocument.load(download.bytes);

  expect(download.filename).toBe("leaky-redacted.pdf");
  expect(download.bytes.toString("latin1")).not.toContain(
    "jane.secret@example.com",
  );
  expect(output.getPageCount()).toBe(1);
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
