import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFStream,
  PDFString,
} from "pdf-lib";

import {
  jpegHasExifSegment,
  pngHasExifChunk,
  readJpegExifMarkers,
} from "@/lib/pdf/jpeg-exif";
import { loadPdf } from "@/lib/pdf/load-pdf";
import { getPdfJs } from "@/lib/pdf/pdfjs";

export type PrivacySeverity = "info" | "warning";

export type PrivacyFinding = {
  category: PrivacyCategory;
  detail: string;
  samples: string[];
  severity: PrivacySeverity;
  title: string;
};

export type PrivacyCategory =
  | "metadata"
  | "xmp"
  | "attachments"
  | "javascript"
  | "forms"
  | "incremental"
  | "hidden-text"
  | "exif";

export type PrivacyAuditReport = {
  attachments: string[];
  findings: PrivacyFinding[];
  formFields: Array<{ name: string; value: string }>;
  hiddenTextCount: number;
  incrementalEofCount: number;
  javascript: string[];
  pageCount: number;
  standardMetadata: Record<string, string>;
  xmpPresent: boolean;
};

const latin1 = new TextDecoder("latin1");
const utf8 = new TextDecoder("utf-8", { fatal: false });

export async function auditPdfPrivacy(source: ArrayBuffer | Uint8Array) {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  const pdf = await loadPdf(bytes);
  const raw = latin1.decode(bytes);
  const standardMetadata = readStandardMetadata(pdf);
  const xmpPreview = readXmpPreview(pdf);
  const attachments = readAttachments(pdf);
  const javascript = readJavascript(pdf);
  const formFields = readFormFields(pdf);
  const incrementalEofCount = countEofMarkers(raw);
  const hidden = await readHiddenText(bytes, pdf);
  const leftover = readIncrementalLeftovers(raw, hidden.visibleText);
  const exif = readEmbeddedImageExif(pdf);

  const findings: PrivacyFinding[] = [];

  pushFinding(findings, {
    category: "metadata",
    detail: "Catalog Info fields that pdf-lib can read.",
    samples: Object.entries(standardMetadata)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${clip(value)}`),
    severity: "info",
    title: "Standard metadata",
  });

  if (xmpPreview.present) {
    findings.push({
      category: "xmp",
      detail:
        "An XMP metadata stream is attached to the catalog. View Metadata does not show this packet.",
      samples: xmpPreview.preview ? [clip(xmpPreview.preview, 240)] : [],
      severity: "warning",
      title: "XMP metadata",
    });
  }

  if (attachments.length > 0) {
    findings.push({
      category: "attachments",
      detail:
        "Embedded files can hold original documents that the pages do not show.",
      samples: attachments.map(clip),
      severity: "warning",
      title: "Embedded files / attachments",
    });
  }

  if (javascript.length > 0) {
    findings.push({
      category: "javascript",
      detail: "JavaScript actions can run in some PDF readers.",
      samples: javascript.map((item) => clip(item, 160)),
      severity: "warning",
      title: "JavaScript actions",
    });
  }

  const valuedFields = formFields.filter((field) => field.value);
  if (formFields.length > 0) {
    findings.push({
      category: "forms",
      detail:
        "AcroForm fields can keep typed values even when they are not obvious on the page.",
      samples: valuedFields.map(
        (field) => `${field.name}: ${clip(field.value, 80)}`,
      ),
      severity: valuedFields.length > 0 ? "warning" : "info",
      title: "Form field values",
    });
  }

  if (incrementalEofCount > 1 || leftover.samples.length > 0) {
    findings.push({
      category: "incremental",
      detail:
        "PDFs can keep earlier revisions after an edit. A full rewrite reduces that surface; it cannot prove every old object is gone.",
      samples: [
        `${incrementalEofCount} %%EOF marker${incrementalEofCount === 1 ? "" : "s"}`,
        ...leftover.samples,
      ],
      severity: "warning",
      title: "Incremental-update leftovers",
    });
  }

  if (hidden.items.length > 0) {
    findings.push({
      category: "hidden-text",
      detail:
        "Text-layer items that sit off the page, use a tiny font, or use invisible text rendering.",
      samples: hidden.items.slice(0, 8),
      severity: "warning",
      title: "Hidden or off-page text",
    });
  }

  if (exif.length > 0) {
    findings.push({
      category: "exif",
      detail: "Best-effort scan of embedded JPEG/PNG bytes for EXIF markers.",
      samples: exif,
      severity: "warning",
      title: "Image EXIF",
    });
  }

  if (raw.includes("/Tr 3")) {
    const existing = findings.find(
      (finding) => finding.category === "hidden-text",
    );
    if (existing) {
      existing.samples.push("Raw operator /Tr 3 (invisible text render mode)");
    } else {
      findings.push({
        category: "hidden-text",
        detail: "The file contains invisible text rendering operators.",
        samples: ["Raw operator /Tr 3 (invisible text render mode)"],
        severity: "warning",
        title: "Hidden or off-page text",
      });
    }
  }

  return {
    attachments,
    findings,
    formFields,
    hiddenTextCount: hidden.items.length,
    incrementalEofCount,
    javascript,
    pageCount: pdf.getPageCount(),
    standardMetadata,
    xmpPresent: xmpPreview.present,
  } satisfies PrivacyAuditReport;
}

function readStandardMetadata(pdf: PDFDocument) {
  return {
    author: pdf.getAuthor() ?? "",
    creationDate: pdf.getCreationDate()?.toISOString() ?? "",
    creator: pdf.getCreator() ?? "",
    keywords: pdf.getKeywords() ?? "",
    modificationDate: pdf.getModificationDate()?.toISOString() ?? "",
    producer: pdf.getProducer() ?? "",
    subject: pdf.getSubject() ?? "",
    title: pdf.getTitle() ?? "",
  };
}

function readXmpPreview(pdf: PDFDocument) {
  const metadata = pdf.catalog.lookup(PDFName.of("Metadata"));

  if (!metadata) {
    return { present: false, preview: "" };
  }

  const preview = decodeStreamText(metadata);
  return {
    present: true,
    preview: preview.includes("<") ? preview : "",
  };
}

function readAttachments(pdf: PDFDocument) {
  const names: string[] = [];
  const catalogNames = pdf.catalog.lookup(PDFName.of("Names"));

  if (catalogNames instanceof PDFDict) {
    collectNameTreeStrings(
      catalogNames.lookup(PDFName.of("EmbeddedFiles")),
      names,
    );
  }

  const af = pdf.catalog.lookup(PDFName.of("AF"));
  if (af instanceof PDFArray) {
    names.push(`Associated files: ${af.size()}`);
  }

  for (const page of pdf.getPages()) {
    const annots = page.node.lookup(PDFName.of("Annots"));
    if (!(annots instanceof PDFArray)) {
      continue;
    }

    for (let index = 0; index < annots.size(); index += 1) {
      const annot = annots.lookup(index);
      if (!(annot instanceof PDFDict)) {
        continue;
      }

      if (
        annot.lookup(PDFName.of("Subtype"))?.toString() === "/FileAttachment"
      ) {
        const contents = asPdfText(annot.lookup(PDFName.of("Contents")));
        names.push(contents || "File attachment annotation");
      }
    }
  }

  return unique(names);
}

function collectNameTreeStrings(node: unknown, output: string[]) {
  if (!(node instanceof PDFDict)) {
    return;
  }

  const entries = node.lookup(PDFName.of("Names"));
  if (entries instanceof PDFArray) {
    for (let index = 0; index < entries.size(); index += 2) {
      const label = asPdfText(entries.lookup(index));
      if (label) {
        output.push(label);
      }
    }
  }

  const kids = node.lookup(PDFName.of("Kids"));
  if (kids instanceof PDFArray) {
    for (let index = 0; index < kids.size(); index += 1) {
      collectNameTreeStrings(kids.lookup(index), output);
    }
  }
}

function readJavascript(pdf: PDFDocument) {
  const samples: string[] = [];

  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) {
      continue;
    }

    const type = object.lookup(PDFName.of("S"))?.toString();
    if (type !== "/JavaScript") {
      continue;
    }

    const script =
      asPdfText(object.lookup(PDFName.of("JS"))) ||
      decodeStreamText(object.lookup(PDFName.of("JS")));
    samples.push(script || "JavaScript action");
  }

  const names = pdf.catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict) {
    collectNameTreeStrings(names.lookup(PDFName.of("JavaScript")), samples);
  }

  return unique(samples);
}

function readFormFields(pdf: PDFDocument) {
  try {
    return pdf
      .getForm()
      .getFields()
      .map((field) => {
        const withText = field as { getText?: () => string | undefined };
        return {
          name: field.getName(),
          value: withText.getText?.()?.trim() ?? "",
        };
      });
  } catch {
    return [];
  }
}

function countEofMarkers(raw: string) {
  return raw.split("%%EOF").length - 1;
}

function readIncrementalLeftovers(raw: string, visibleText: string) {
  const visible = visibleText.toLowerCase();
  const samples: string[] = [];
  const stringPattern = /\(([^()\\]{8,80})\)/g;
  let match: RegExpExecArray | null;

  while ((match = stringPattern.exec(raw)) && samples.length < 8) {
    const value = match[1]?.trim() ?? "";

    if (!value || /Helvetica|Times|Arial|PDFForge|Type|Font/i.test(value)) {
      continue;
    }

    if (!visible.includes(value.toLowerCase())) {
      samples.push(`Literal not in text layer: ${clip(value, 80)}`);
    }
  }

  if (raw.includes("/Prev")) {
    samples.unshift("Trailer contains /Prev (previous xref)");
  }

  return { samples: unique(samples) };
}

async function readHiddenText(bytes: Uint8Array, pdf: PDFDocument) {
  const items: string[] = [];
  const visibleChunks: string[] = [];
  const pageCount = Math.min(pdf.getPageCount(), 25);

  try {
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: bytes.slice(),
      disableAutoFetch: true,
      disableStream: true,
      useWorkerFetch: false,
    });
    const document = await loadingTask.promise;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();

      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) {
          continue;
        }

        visibleChunks.push(item.str);
        const transform = "transform" in item ? item.transform : undefined;
        const height = "height" in item ? Number(item.height) : 0;
        const [x, y] = transform
          ? viewport.convertToViewportPoint(transform[4], transform[5])
          : [0, 0];
        const reasons: string[] = [];

        if (
          x < -4 ||
          y < -4 ||
          x > viewport.width + 4 ||
          y > viewport.height + 4
        ) {
          reasons.push("off-page");
        }

        if (height > 0 && height < 1) {
          reasons.push("tiny-font");
        }

        if (reasons.length > 0) {
          items.push(
            `Page ${pageNumber} (${reasons.join(", ")}): ${clip(item.str)}`,
          );
        }
      }

      page.cleanup();
    }

    await document.cleanup();
    await loadingTask.destroy();
  } catch {
    return { items, visibleText: visibleChunks.join(" ") };
  }

  return { items, visibleText: visibleChunks.join(" ") };
}

function readEmbeddedImageExif(pdf: PDFDocument) {
  const samples: string[] = [];

  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream) && !(object instanceof PDFStream)) {
      continue;
    }

    const bytes = decodeStreamBytes(object);

    if (!bytes || bytes.length < 16) {
      continue;
    }

    if (jpegHasExifSegment(bytes)) {
      samples.push(`JPEG ${readJpegExifMarkers(bytes).join(", ")}`);
    } else if (pngHasExifChunk(bytes)) {
      samples.push("PNG eXIf chunk");
    }
  }

  return unique(samples).slice(0, 12);
}

function decodeStreamText(value: unknown) {
  const bytes = decodeStreamBytes(value);
  if (!bytes) {
    return asPdfText(value);
  }

  return utf8.decode(bytes);
}

function decodeStreamBytes(value: unknown) {
  if (!value) {
    return null;
  }

  try {
    if (value instanceof PDFRawStream || value instanceof PDFStream) {
      const contents = value.getContents();
      return contents instanceof Uint8Array ? contents : null;
    }
  } catch {
    return null;
  }

  return null;
}

function asPdfText(value: unknown) {
  if (value instanceof PDFString || value instanceof PDFHexString) {
    return value.decodeText().trim();
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function pushFinding(findings: PrivacyFinding[], finding: PrivacyFinding) {
  if (finding.samples.length === 0) {
    return;
  }

  findings.push(finding);
}

function clip(value: string, max = 120) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
