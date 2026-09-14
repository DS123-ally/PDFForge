import { afterEach, describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  getSecurityHeaders,
} from "@/config/security-headers";
import { persistencePolicy } from "@/lib/privacy/persistence";
import {
  getTemporaryCleanupCount,
  registerTemporaryCleanup,
  resetTemporaryCleanupForTests,
  runTemporaryCleanup,
} from "@/lib/privacy/temporary-data";

describe("security headers", () => {
  it("builds a same-origin CSP without third-party connect", () => {
    const productionCsp = buildContentSecurityPolicy(false);

    expect(productionCsp).toContain("default-src 'self'");
    expect(productionCsp).toContain("connect-src 'self'");
    expect(productionCsp).toContain("frame-ancestors 'none'");
    expect(productionCsp).not.toContain("'unsafe-eval'");
    expect(productionCsp).not.toContain("https://");
  });

  it("exposes clickjacking and sniffing protections", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders().map((header) => [header.key, header.value]),
    );

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
  });
});

describe("privacy persistence policy", () => {
  it("does not enable document storage or analytics", () => {
    expect(persistencePolicy.indexedDB).toBe(false);
    expect(persistencePolicy.localStorage).toBe(false);
    expect(persistencePolicy.analytics).toBe(false);
    expect(persistencePolicy.cookies).toBe(false);
  });
});

describe("temporary data cleanup", () => {
  afterEach(() => {
    resetTemporaryCleanupForTests();
  });

  it("runs registered cleaners", () => {
    let cleaned = 0;
    registerTemporaryCleanup(() => {
      cleaned += 1;
    });

    expect(getTemporaryCleanupCount()).toBe(1);
    runTemporaryCleanup();
    expect(cleaned).toBe(1);
  });
});
