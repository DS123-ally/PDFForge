import {
  isEncryptedPdfError,
  PdfCorruptError,
  PdfPasswordProtectedError,
} from "@/lib/pdf/pdf-errors";

export async function loadPdf(source: Blob | ArrayBuffer | Uint8Array) {
  const bytes =
    source instanceof Blob
      ? await source.arrayBuffer()
      : source instanceof Uint8Array
        ? source
        : source;

  try {
    const { PDFDocument, ParseSpeeds } = await import("pdf-lib");

    return await PDFDocument.load(bytes, {
      parseSpeed: ParseSpeeds.Fastest,
      updateMetadata: false,
    });
  } catch (error) {
    if (isEncryptedPdfError(error)) {
      throw new PdfPasswordProtectedError();
    }

    throw new PdfCorruptError();
  }
}
