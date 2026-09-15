import { PDFArray, PDFDict, PDFName, PDFRawStream, PDFStream } from "pdf-lib";

import { createOutputName } from "@/lib/files/create-output-name";
import { stripJpegApp1Exif } from "@/lib/pdf/jpeg-exif";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { savePdf } from "@/lib/pdf/save-pdf";

export type PrivacySanitizeOptions = {
  dropAttachments: boolean;
  dropJavascript: boolean;
  flattenForms: boolean;
  stripFormValues: boolean;
  stripImageExif: boolean;
  stripMetadata: boolean;
};

export const defaultPrivacySanitizeOptions: PrivacySanitizeOptions = {
  dropAttachments: true,
  dropJavascript: true,
  flattenForms: false,
  stripFormValues: true,
  stripImageExif: true,
  stripMetadata: true,
};

export async function sanitizePdfBuffer(
  bytes: ArrayBuffer,
  options: PrivacySanitizeOptions,
  sourceName = "document.pdf",
) {
  const pdf = await loadPdf(bytes);

  if (options.stripMetadata) {
    pdf.setTitle("");
    pdf.setAuthor("");
    pdf.setSubject("");
    pdf.setKeywords([]);
    pdf.setProducer("PDFForge");
    pdf.setCreator("PDFForge");
    pdf.setCreationDate(new Date(0));
    pdf.setModificationDate(new Date(0));
    pdf.catalog.delete(PDFName.of("Metadata"));
  }

  if (options.dropAttachments) {
    dropAttachments(pdf.catalog);
    dropFileAttachmentAnnots(pdf);
  }

  if (options.dropJavascript) {
    dropJavascript(pdf);
  }

  if (options.stripFormValues || options.flattenForms) {
    try {
      const form = pdf.getForm();

      if (options.stripFormValues) {
        for (const field of form.getFields()) {
          const textField = field as { setText?: (value: string) => void };
          textField.setText?.("");
        }
      }

      if (options.flattenForms && form.getFields().length > 0) {
        form.flatten();
      }
    } catch {
      // Forms that pdf-lib cannot parse are left with the honest limitation.
    }
  }

  if (options.stripImageExif) {
    stripImageExif(pdf);
  }

  return {
    fileCount: 1,
    filename: createOutputName(sourceName, { suffix: "sanitized" }),
    outputBytes: toArrayBuffer(await savePdf(pdf)),
    totalPages: pdf.getPageCount(),
  };
}

function dropAttachments(catalog: PDFDict) {
  const names = catalog.lookup(PDFName.of("Names"));

  if (names instanceof PDFDict) {
    names.delete(PDFName.of("EmbeddedFiles"));
  }

  catalog.delete(PDFName.of("AF"));
}

function dropFileAttachmentAnnots(pdf: Awaited<ReturnType<typeof loadPdf>>) {
  for (const page of pdf.getPages()) {
    const annots = page.node.lookup(PDFName.of("Annots"));

    if (!(annots instanceof PDFArray)) {
      continue;
    }

    const kept = [];

    for (let index = 0; index < annots.size(); index += 1) {
      const annot = annots.lookup(index);

      if (
        annot instanceof PDFDict &&
        annot.lookup(PDFName.of("Subtype"))?.toString() === "/FileAttachment"
      ) {
        continue;
      }

      kept.push(annots.get(index));
    }

    if (kept.length === 0) {
      page.node.delete(PDFName.of("Annots"));
    } else if (kept.length !== annots.size()) {
      const next = pdf.context.obj(kept);
      page.node.set(PDFName.of("Annots"), next);
    }
  }
}

function dropJavascript(pdf: Awaited<ReturnType<typeof loadPdf>>) {
  const catalog = pdf.catalog;
  const openAction = catalog.lookup(PDFName.of("OpenAction"));

  if (isJavascriptAction(openAction)) {
    catalog.delete(PDFName.of("OpenAction"));
  }

  catalog.delete(PDFName.of("AA"));

  const names = catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict) {
    names.delete(PDFName.of("JavaScript"));
  }

  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) {
      continue;
    }

    if (isJavascriptAction(object)) {
      object.delete(PDFName.of("JS"));
      object.delete(PDFName.of("S"));
    }

    const aa = object.lookup(PDFName.of("AA"));
    if (aa instanceof PDFDict) {
      for (const [key, value] of aa.entries()) {
        if (isJavascriptAction(value)) {
          aa.delete(key);
        }
      }
    }
  }
}

function isJavascriptAction(value: unknown) {
  return (
    value instanceof PDFDict &&
    value.lookup(PDFName.of("S"))?.toString() === "/JavaScript"
  );
}

function stripImageExif(pdf: Awaited<ReturnType<typeof loadPdf>>) {
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream) && !(object instanceof PDFStream)) {
      continue;
    }

    try {
      const contents = object.getContents();

      if (!(contents instanceof Uint8Array) || contents.length < 16) {
        continue;
      }

      if (contents[0] === 0xff && contents[1] === 0xd8) {
        const stripped = stripJpegApp1Exif(contents);

        if (stripped !== contents) {
          Reflect.set(object, "contents", stripped);
        }
      }
    } catch {
      // Best-effort only.
    }
  }
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
