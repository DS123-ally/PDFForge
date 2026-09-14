import { describe, expect, it } from "vitest";

import {
  isSensitiveDocumentRequest,
  shouldCacheResponse,
} from "@/lib/pwa/cache-policy";
import {
  getMemoryWarningMessage,
  shouldWarnForSelection,
} from "@/lib/performance/memory";
import { shouldReusePdfWorker } from "@/lib/workers/worker-lifecycle";

describe("PWA cache policy", () => {
  it("never caches document uploads, PDFs, or ZIP files", () => {
    expect(
      isSensitiveDocumentRequest({
        method: "POST",
        url: "http://127.0.0.1/tools/merge-pdf",
      }),
    ).toBe(true);
    expect(
      shouldCacheResponse({
        contentType: "application/pdf",
        method: "GET",
        url: "http://127.0.0.1/output.pdf",
      }),
    ).toBe(false);
    expect(
      shouldCacheResponse({
        method: "GET",
        url: "blob:http://127.0.0.1/abc",
      }),
    ).toBe(false);
  });

  it("allows the application shell and static Next assets", () => {
    expect(
      shouldCacheResponse({
        destination: "document",
        method: "GET",
        url: "http://127.0.0.1/offline",
      }),
    ).toBe(true);
    expect(
      shouldCacheResponse({
        method: "GET",
        url: "http://127.0.0.1/_next/static/chunks/app.js",
      }),
    ).toBe(true);
    expect(
      shouldCacheResponse({
        destination: "document",
        method: "GET",
        url: "http://127.0.0.1/tools/merge-pdf",
      }),
    ).toBe(false);
  });
});

describe("memory warnings", () => {
  it("warns for large selections", () => {
    expect(shouldWarnForSelection(80 * 1024 * 1024)).toBe(true);
    expect(getMemoryWarningMessage(80 * 1024 * 1024)).toMatch(/large/i);
    expect(shouldWarnForSelection(1024)).toBe(false);
  });
});

describe("worker reuse", () => {
  it("reuses workers except after password operations", () => {
    expect(shouldReusePdfWorker("merge")).toBe(true);
    expect(shouldReusePdfWorker("protect-pdf")).toBe(false);
    expect(shouldReusePdfWorker("unlock-pdf")).toBe(false);
  });
});
