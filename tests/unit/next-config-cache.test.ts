import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("production cache headers", () => {
  it("keeps hashed static and OCR immutable and the service worker uncached", async () => {
    const headers = (await nextConfig.headers?.()) ?? [];
    const bySource = Object.fromEntries(
      headers.map((entry) => [entry.source, entry.headers]),
    );

    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.poweredByHeader).toBe(false);

    expect(bySource["/_next/static/:path*"]).toEqual(
      expect.arrayContaining([
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ]),
    );
    expect(bySource["/ocr/:path*"]).toEqual(
      expect.arrayContaining([
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ]),
    );
    expect(bySource["/sw.js"]).toEqual(
      expect.arrayContaining([
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
      ]),
    );
    expect(bySource["/health"]).toEqual(
      expect.arrayContaining([
        { key: "Cache-Control", value: "no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ]),
    );
  });
});
