import type { PDFDocument } from "pdf-lib";

export async function savePdf(document: PDFDocument) {
  return document.save({
    addDefaultPage: false,
    useObjectStreams: true,
  });
}
