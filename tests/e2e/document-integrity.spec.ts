import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test("fingerprints a file locally and compares two copies", async ({
  page,
}) => {
  const payload = Buffer.from("PDFForge integrity e2e");
  const expected = createHash("sha256").update(payload).digest("hex");
  const leakedRequests: string[] = [];

  page.on("request", (request) => {
    const body = request.postData() ?? "";

    if (
      request.method() === "POST" ||
      body.includes("PDFForge integrity e2e")
    ) {
      leakedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/workspace#document-integrity");
  await expect(
    page.getByRole("heading", { name: "Document Integrity" }),
  ).toBeVisible();
  await page.getByTestId("integrity-fingerprint-input").setInputFiles({
    buffer: payload,
    mimeType: "text/plain",
    name: "contract.txt",
  });
  await expect(page.getByText(expected)).toBeVisible({ timeout: 15_000 });

  await page.getByRole("tab", { name: "Compare" }).click();
  await page.getByTestId("integrity-compare-a").setInputFiles({
    buffer: payload,
    mimeType: "text/plain",
    name: "original.txt",
  });
  await page.getByTestId("integrity-compare-b").setInputFiles({
    buffer: payload,
    mimeType: "text/plain",
    name: "copy.txt",
  });
  await expect(page.getByText("These files match")).toBeVisible();

  await page.getByTestId("integrity-compare-b").setInputFiles({
    buffer: Buffer.from("tampered"),
    mimeType: "text/plain",
    name: "changed.txt",
  });
  await expect(
    page.getByText("These files differ — possible tampering"),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Verify Hash" }).click();
  await page.getByLabel("Expected hash").fill(expected);
  await page.getByTestId("integrity-verify-input").setInputFiles({
    buffer: payload,
    mimeType: "text/plain",
    name: "check.txt",
  });
  await expect(page.getByText("Hash matches")).toBeVisible();
  expect(leakedRequests).toEqual([]);
});
