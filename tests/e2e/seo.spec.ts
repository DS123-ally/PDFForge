import { expect, test } from "@playwright/test";

test("publishes unique SEO for a completed tool page", async ({ page }) => {
  await page.goto("/tools/merge-pdf");

  await expect(page).toHaveTitle(/Merge PDF files locally in your browser/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "Merge PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How Merge PDF works" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How to use Merge PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Merge PDF FAQs" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Merge PDFs" })).toBeVisible();

  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveAttribute("href", /\/tools\/merge-pdf\/?$/);

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(jsonLd).toContain("FAQPage");
  expect(jsonLd).toContain("Does merging upload my PDFs?");
});

test("keeps the hash workspace out of the index", async ({ page }) => {
  const robots = await page.goto("/robots.txt");
  const robotsBody = (await robots?.text()) ?? "";
  expect(robotsBody).toContain("Disallow: /workspace");
  expect(robotsBody).toContain("Disallow: /offline");
  expect(robotsBody).toContain("Disallow: /health");
  expect(robotsBody).toContain("Sitemap:");

  const sitemap = await page.goto("/sitemap.xml");
  const sitemapBody = (await sitemap?.text()) ?? "";
  expect(sitemapBody).toContain("/tools/merge-pdf");
  expect(sitemapBody).toContain("/privacy");
  expect(sitemapBody).not.toContain("/workspace");
  expect(sitemapBody).not.toContain("/offline");
  expect(sitemapBody).not.toContain("/tools/merge-pdf/states");

  await page.goto("/workspace");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/i,
  );
});
