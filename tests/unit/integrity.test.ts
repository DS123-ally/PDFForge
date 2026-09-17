import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { validateFile } from "@/lib/files/validate-file";
import {
  algorithmForHashLength,
  hashBytes,
  hashesMatch,
  normalizeHash,
} from "@/lib/integrity/hash-file";

describe("document integrity hashing", () => {
  it("matches Node SHA-256 for the same bytes", async () => {
    const bytes = new TextEncoder().encode("PDFForge integrity");
    const expected = createHash("sha256").update(bytes).digest("hex");

    await expect(hashBytes(bytes, "SHA-256")).resolves.toBe(expected);
  });

  it("normalizes pasted hashes and compares them", () => {
    expect(normalizeHash("  0xAb Cd  ")).toBe("abcd");
    expect(hashesMatch("ABC", "abc")).toBe(true);
    expect(hashesMatch("aaa", "bbb")).toBe(false);
    expect(algorithmForHashLength("a".repeat(64))).toBe("SHA-256");
    expect(algorithmForHashLength("b".repeat(128))).toBe("SHA-512");
    expect(algorithmForHashLength("abc")).toBeNull();
  });

  it("accepts a non-PDF file for integrity hashing", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });

    await expect(
      validateFile(file, { acceptedTypes: ["any"] }),
    ).resolves.toMatchObject({ file });
  });
});
