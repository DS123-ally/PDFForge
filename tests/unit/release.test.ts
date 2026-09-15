import { describe, expect, it } from "vitest";

import {
  hostHstsHeader,
  isProductionSiteUrl,
  requiredReleaseDocs,
  supportedBrowsers,
} from "@/config/release";

describe("release packaging", () => {
  it("covers Chromium, Firefox, and WebKit", () => {
    expect(supportedBrowsers.map((browser) => browser.playwright)).toEqual([
      "chromium",
      "firefox",
      "webkit",
    ]);
  });

  it("treats only HTTPS origins as production site URLs", () => {
    expect(isProductionSiteUrl("https://pdfforge.example")).toBe(true);
    expect(isProductionSiteUrl("http://localhost:3000")).toBe(false);
    expect(isProductionSiteUrl("not-a-url")).toBe(false);
  });

  it("documents host-level HSTS and required runbooks", () => {
    expect(hostHstsHeader.key).toBe("Strict-Transport-Security");
    expect(requiredReleaseDocs).toEqual([
      "docs/release.md",
      "docs/acceptance.md",
    ]);
  });
});
