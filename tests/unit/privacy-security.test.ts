import { afterEach, describe, expect, it } from "vitest";

import {
  buildContentSecurityPolicy,
  getScriptSrcDirective,
  getSecurityHeaders,
} from "@/config/security-headers";
import { findExtensionInjectedNodes } from "@/lib/privacy/extension-guard";
import { persistencePolicy } from "@/lib/privacy/persistence";
import {
  getTemporaryCleanupCount,
  registerTemporaryCleanup,
  resetTemporaryCleanupForTests,
  runTemporaryCleanup,
} from "@/lib/privacy/temporary-data";
import {
  getWorkspaceHref,
  readWorkspaceSlug,
  requestLeaksToolChoice,
} from "@/lib/privacy/tool-location";

describe("security headers", () => {
  it("uses a nonce instead of unsafe-inline scripts in production", () => {
    const productionCsp = buildContentSecurityPolicy({
      isDevelopment: false,
      nonce: "test-nonce",
    });
    const scriptSrc = getScriptSrcDirective(productionCsp);

    expect(productionCsp).toContain("default-src 'self'");
    expect(productionCsp).toContain("connect-src 'self'");
    expect(scriptSrc).toContain("'nonce-test-nonce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(productionCsp).not.toContain("https://");
  });

  it("exposes clickjacking and sniffing protections", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders().map((header) => [header.key, header.value]),
    );

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Permissions-Policy"]).toContain("camera=(self)");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
  });
});

describe("privacy persistence policy", () => {
  it("does not enable document storage or analytics", () => {
    expect(persistencePolicy.indexedDB).toBe(false);
    expect(persistencePolicy.localStorage).toBe(false);
    expect(persistencePolicy.analytics).toBe(false);
    expect(persistencePolicy.cookies).toBe(false);
    expect(persistencePolicy.recipeSettings).toBe("opt-in");
  });
});

describe("tool location privacy", () => {
  it("keeps the optional workspace tool choice in the hash", () => {
    expect(readWorkspaceSlug("#merge-pdf")).toBe("merge-pdf");
    expect(readWorkspaceSlug("#main-content")).toBe("");
    expect(requestLeaksToolChoice("http://127.0.0.1/workspace")).toBe(false);
    expect(requestLeaksToolChoice("http://127.0.0.1/tools/merge-pdf")).toBe(
      true,
    );
  });
});

describe("extension guard", () => {
  it("detects extension-scheme resources", () => {
    const root = document.createElement("div");
    root.innerHTML = `<script src="chrome-extension://abc/content.js"></script>`;
    expect(findExtensionInjectedNodes(root)).toHaveLength(1);
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
