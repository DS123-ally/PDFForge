import * as pdfLib from "pdf-lib";
import { configure, lock, unlockInPlace } from "pdf-lib-encrypt";

import { createOutputName } from "@/lib/files/create-output-name";
import { loadPdf } from "@/lib/pdf/load-pdf";
import {
  isUnsupportedEncryptionError,
  isWrongPasswordError,
  PdfUnsupportedEncryptionError,
  PdfWrongPasswordError,
} from "@/lib/pdf/pdf-errors";

configure(pdfLib);

export const minPasswordLength = 8;
export const pdfEncryptionMethod = "AES-256 (/V5 /R6 /AESV3)";

export function assertUsablePassword(password: string) {
  if (password.length < minPasswordLength) {
    throw new Error(
      `Use a password of at least ${minPasswordLength} characters.`,
    );
  }
}

export async function protectPdfBuffer(
  bytes: ArrayBuffer,
  password: string,
  sourceName = "document.pdf",
) {
  assertUsablePassword(password);
  const pdf = await loadPdf(bytes);
  const plaintext = await pdf.save({
    addDefaultPage: false,
    useObjectStreams: false,
  });
  const encrypted = await lock(plaintext, password);

  return {
    encryption: pdfEncryptionMethod,
    fileCount: 1,
    filename: createOutputName(sourceName, { suffix: "protected" }),
    outputBytes: toArrayBuffer(encrypted),
    totalPages: pdf.getPageCount(),
  };
}

export async function unlockPdfBuffer(
  bytes: ArrayBuffer,
  password: string,
  sourceName = "document.pdf",
) {
  try {
    const pdf = await pdfLib.PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const wasEncrypted = await unlockInPlace(pdf, password);
    const output = await pdf.save({
      addDefaultPage: false,
      useObjectStreams: false,
    });

    return {
      fileCount: 1,
      filename: createOutputName(sourceName, { suffix: "unlocked" }),
      outputBytes: toArrayBuffer(output),
      totalPages: pdf.getPageCount(),
      wasEncrypted,
    };
  } catch (error) {
    if (isWrongPasswordError(error)) {
      throw new PdfWrongPasswordError();
    }

    if (isUnsupportedEncryptionError(error)) {
      throw new PdfUnsupportedEncryptionError();
    }

    throw error;
  }
}

export function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
