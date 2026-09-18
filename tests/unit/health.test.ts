import { describe, expect, it } from "vitest";

import { GET } from "@/app/health/route";
import { indexablePaths, noindexPaths } from "@/config/site";

describe("health endpoint", () => {
  it("returns ok without indexing", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, service: "pdfforge" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("stays off the public sitemap list", () => {
    expect(noindexPaths).toContain("/health");
    expect(indexablePaths).not.toContain("/health");
  });
});
