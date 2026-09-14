import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test("registers a service worker that does not cache PDF responses", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /edit pdfs directly in your browser/i }),
  ).toBeVisible();

  const scriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? "";
  });

  expect(scriptUrl).toContain("/sw.js");

  const allowsPdfCache = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const keys = (
      await Promise.all(
        cacheNames.map(async (name) => (await caches.open(name)).keys()),
      )
    ).flat();
    return keys.some((request) => request.url.toLowerCase().includes(".pdf"));
  });

  expect(allowsPdfCache).toBe(false);
});

test("keeps the offline application shell available", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(
    browserName === "webkit",
    "WebKit on Windows does not support emulated offline service worker navigation in Playwright",
  );

  await page.goto("/offline");
  await expect(
    page.getByRole("heading", {
      name: /you can keep using the pdfforge shell/i,
    }),
  ).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: /you can keep using the pdfforge shell/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("Uploaded PDFs or images")).toBeVisible();
});
