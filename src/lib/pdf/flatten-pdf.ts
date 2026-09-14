import { PDFName } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { savePdf } from "@/lib/pdf/save-pdf";
import { toArrayBuffer } from "@/lib/pdf/password-pdf";

export async function flattenPdfBuffer(
  bytes: ArrayBuffer,
  sourceName = "document.pdf",
) {
  const pdf = await loadPdf(bytes);
  const form = pdf.getForm();
  const fieldCount = form.getFields().length;

  if (fieldCount > 0) {
    form.flatten();
  }

  const leftoverAnnotationPages = pdf.getPages().filter((page) => {
    const annots = page.node.lookup(PDFName.of("Annots"));
    return Boolean(annots);
  }).length;

  return {
    fileCount: 1,
    filename: createOutputName(sourceName, { suffix: "flattened" }),
    flattenedFieldCount: fieldCount,
    leftoverAnnotationPages,
    outputBytes: toArrayBuffer(await savePdf(pdf)),
    totalPages: pdf.getPageCount(),
  };
}
