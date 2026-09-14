import { expect, test, type Page } from "@playwright/test";

import { createPdfBytes } from "../fixtures/pdf";

test("privacy policy describes local-only processing", async ({ page }) => {
  await page.goto("/privacy");

  await expect(
    page.getByRole("heading", { name: /your files stay on this device/i }),
  ).toBeVisible();
  await expect(page.getByText("What we do not collect")).toBeVisible();
  await expect(page.getByText(/indexeddb/i)).toBeVisible();
  await expect(
    page.getByText(
      "Analytics events, advertising identifiers, or error reports",
    ),
  ).toBeVisible();
});

test("sends security headers and no document bytes on the network", async ({
  baseURL,
  page,
}) => {
  const leaked = listenForDocumentLeak(page, baseURL ?? page.url());
  const response = await page.goto("/tools/merge-pdf");

  expect(response).not.toBeNull();
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("connect-src 'self'");
  expect(headers["x-frame-options"]?.toLowerCase()).toBe("deny");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-content-type-options"]).toBe("nosniff");

  const firstPdf = await createPdfBytes({ pageCount: 1 });
  const secondPdf = await createPdfBytes({ pageCount: 2 });
  await page.locator("input[type='file']").setInputFiles([
    {
      buffer: Buffer.from(firstPdf),
      mimeType: "application/pdf",
      name: "first.pdf",
    },
    {
      buffer: Buffer.from(secondPdf),
      mimeType: "application/pdf",
      name: "second.pdf",
    },
  ]);
  await expect(page.getByText("2 files ready")).toBeVisible();
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(
    page.getByRole("heading", { name: "Your merged PDF is ready" }),
  ).toBeVisible();

  const persistence = await page.evaluate(async () => {
    const databases =
      "databases" in indexedDB ? await indexedDB.databases() : [];
    return {
      documentDatabases: databases
        .map((database) => database.name ?? "")
        .filter((name) => /pdf|document|file|password/i.test(name)),
      localKeys: Object.keys(localStorage).filter((key) =>
        /pdf|document|file|password|metadata/i.test(key),
      ),
    };
  });

  expect(leaked).toEqual([]);
  expect(persistence.documentDatabases).toEqual([]);
  expect(persistence.localKeys).toEqual([]);
});

function listenForDocumentLeak(page: Page, baseURL: string) {
  const leaked: string[] = [];
  const origin = new URL(baseURL).origin;

  page.on("request", (request) => {
    const url = new URL(request.url());
    const body = request.postData() ?? "";
    const isDocumentProtocol =
      url.protocol === "blob:" || url.protocol === "data:";

    if (request.method() !== "GET" && request.method() !== "HEAD") {
      leaked.push(`${request.method()} ${request.url()}`);
    }

    if (body.includes("%PDF") || url.pathname.toLowerCase().endsWith(".pdf")) {
      leaked.push(request.url());
    }

    if (!isDocumentProtocol && url.origin !== origin && url.origin !== "null") {
      leaked.push(`third-party ${request.url()}`);
    }
  });

  return leaked;
}
