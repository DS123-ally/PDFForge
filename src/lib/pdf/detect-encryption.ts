import { loadPdf } from "@/lib/pdf/load-pdf";
import { PdfPasswordProtectedError } from "@/lib/pdf/pdf-errors";

export async function detectPdfEncryption(file: Blob) {
  try {
    await loadPdf(file);
    return false;
  } catch (error) {
    if (error instanceof PdfPasswordProtectedError) {
      return true;
    }

    throw error;
  }
}
