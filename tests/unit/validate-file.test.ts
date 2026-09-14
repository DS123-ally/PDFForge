import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { FilePipelineError } from "@/lib/files/file-errors";
import {
  createFileFingerprint,
  validateFile,
  validateFiles,
} from "@/lib/files/validate-file";
import { createEncryptedPdfBytes, toArrayBuffer } from "../fixtures/pdf";

describe("validateFile", () => {
  it("accepts a readable PDF file", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    const file = new File([toArrayBuffer(bytes)], "document.pdf", {
      type: "application/pdf",
    });

    await expect(validateFile(file)).resolves.toMatchObject({
      file,
      fingerprint: createFileFingerprint(file),
      pageCount: 1,
    });
  });

  it("rejects a file that is too large before reading it", async () => {
    const file = new File(["%PDF-"], "large.pdf", {
      type: "application/pdf",
    });

    await expect(validateFile(file, { maxFileSizeBytes: 2 })).rejects.toThrow(
      FilePipelineError,
    );
  });

  it("rejects a corrupt PDF with a clear error code", async () => {
    const file = new File(["%PDF-not-a-real-document"], "broken.pdf", {
      type: "application/pdf",
    });

    await expect(validateFile(file)).rejects.toMatchObject({
      code: "invalid_pdf",
    });
  });

  it("rejects a password-protected PDF with a clear error code", async () => {
    const file = new File(
      [toArrayBuffer(await createEncryptedPdfBytes())],
      "locked.pdf",
      { type: "application/pdf" },
    );

    await expect(validateFile(file)).rejects.toMatchObject({
      code: "password_protected_pdf",
    });
  });

  it("accepts a password-protected PDF when the unlock tool allows it", async () => {
    const file = new File(
      [toArrayBuffer(await createEncryptedPdfBytes())],
      "locked.pdf",
      { type: "application/pdf" },
    );

    await expect(
      validateFile(file, { allowPasswordProtected: true }),
    ).resolves.toMatchObject({
      file,
      isPasswordProtected: true,
    });
  });
});

describe("validateFiles", () => {
  it("detects duplicates in the same selection batch", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    const options = { type: "application/pdf", lastModified: 123 };
    const first = new File([toArrayBuffer(bytes)], "same.pdf", options);
    const second = new File([toArrayBuffer(bytes)], "same.pdf", options);

    const result = await validateFiles([first, second]);

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.error.code).toBe("duplicate_file");
  });
});
