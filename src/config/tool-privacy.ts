export type ToolPrivacy = {
  reads: string;
  slug: string;
  writes: string;
};

export const toolPrivacy: readonly ToolPrivacy[] = [
  {
    slug: "merge-pdf",
    reads: "The PDF files you drop, in the order shown.",
    writes: "One combined PDF.",
  },
  {
    slug: "compress-pdf",
    reads:
      "The PDF you drop. Page-picture mode also reads the pixels of each rendered page.",
    writes:
      "A PDF. Lossless rewrite keeps selectable text and returns the original file when the rewrite is not smaller. Page pictures are JPEG pages without selectable text.",
  },
  {
    slug: "private-recipes",
    reads:
      "The PDFs you drop, the steps in the recipe, and any password you type for a protect step. An optional settings save stores the recipe only.",
    writes:
      "One PDF from the recipe, plus the before and after hashes shown on the page.",
  },
  {
    slug: "split-pdf",
    reads: "One PDF and the pages or ranges you enter.",
    writes: "One PDF, or a ZIP when the mode produces more than one file.",
  },
  {
    slug: "organize-pdf",
    reads: "One PDF and the order, rotation, and page removals you choose.",
    writes: "One reorganized PDF.",
  },
  {
    slug: "scan-document",
    reads:
      "Camera frames or photos you pick. Optional English OCR reads the flattened page on this device.",
    writes: "A PDF. OCR text, when you leave it on, is inside that file.",
  },
  {
    slug: "images-to-pdf",
    reads:
      "JPG or PNG files and the page size, orientation, margins, and fit you set.",
    writes: "One PDF.",
  },
  {
    slug: "pdf-to-images",
    reads: "One PDF and the pages, format, and resolution you choose.",
    writes: "JPG or PNG files.",
  },
  {
    slug: "pdf-to-word",
    reads:
      "The PDF text layer. Pages with no selectable text can be read with on-device English OCR when that option is on. Page pictures are included only when that option is on.",
    writes: "A .docx file.",
  },
  {
    slug: "pdf-to-excel",
    reads:
      "Selectable PDF text, including gaps that become columns. Pages with no selectable text can be read with on-device English OCR when that option is on.",
    writes: "A .xlsx file.",
  },
  {
    slug: "pdf-to-ppt",
    reads:
      "Page pictures when that option is on. Otherwise the slide text comes from the text layer, with on-device English OCR on empty pages when that option is on.",
    writes: "A .pptx file.",
  },
  {
    slug: "pdf-to-html",
    reads:
      "Headings, paragraphs, and simple tables from the text layer, plus page pictures when that option is on. Empty pages can use on-device English OCR when that option is on.",
    writes: "An HTML file.",
  },
  {
    slug: "word-to-pdf",
    reads:
      "Paragraphs, headings, lists, and simple tables in the .docx. Pictures in the file are skipped.",
    writes:
      "A PDF of that text. Word fonts and page layout are not in the download.",
  },
  {
    slug: "excel-to-pdf",
    reads:
      "Sheet names and cell values, including cached formula results stored in the .xlsx.",
    writes: "A PDF table for each sheet.",
  },
  {
    slug: "powerpoint-to-pdf",
    reads: "The text on each slide. Pictures and shapes are skipped.",
    writes: "A PDF with one page of text per slide.",
  },
  {
    slug: "markdown-to-pdf",
    reads:
      "Headings, paragraphs, lists, and simple pipe tables. Image links are skipped.",
    writes: "A PDF of that text.",
  },
  {
    slug: "csv-to-pdf",
    reads: "The rows and comma-separated columns in the file.",
    writes: "A PDF table. The first row is the header.",
  },
  {
    slug: "rotate-pdf",
    reads: "One PDF and the rotation you set.",
    writes: "One rotated PDF.",
  },
  {
    slug: "add-watermark",
    reads:
      "One PDF and the watermark text, opacity, position, and rotation you set.",
    writes: "One PDF with that text drawn on the pages.",
  },
  {
    slug: "add-page-numbers",
    reads: "One PDF and the position, starting number, and format you set.",
    writes: "One PDF with page numbers.",
  },
  {
    slug: "add-headers-footers",
    reads: "One PDF and the header and footer text you type.",
    writes: "One PDF with that text on each page.",
  },
  {
    slug: "privacy-risk-scanner",
    reads:
      "The text layer and document structure used to find identifiers such as Aadhaar, PAN, GST, IFSC, UPI, cards, emails, and phones, plus metadata and hidden text notes.",
    writes:
      "A report on this page. A download is a rasterized PDF of the hits you confirm.",
  },
  {
    slug: "privacy-inspector",
    reads:
      "Metadata, attachments, JavaScript, form values, incremental leftovers, hidden text, and image EXIF.",
    writes:
      "A report on this page. A download is a new PDF with the sanitize options you confirm.",
  },
  {
    slug: "remove-metadata",
    reads: "Supported document properties on one PDF.",
    writes: "A PDF with those properties cleared.",
  },
  {
    slug: "view-metadata",
    reads: "Supported document properties on one PDF.",
    writes:
      "Nothing. The properties stay on this page, and the file on disk is unchanged.",
  },
  {
    slug: "extract-text",
    reads:
      "The text layer. Pages with no selectable text can be read with on-device English OCR.",
    writes: "Text you copy or download. The original PDF is unchanged.",
  },
  {
    slug: "password-protect-pdf",
    reads: "One PDF and the password you type. The password is not stored.",
    writes: "An AES-256 protected PDF.",
  },
  {
    slug: "unlock-pdf",
    reads:
      "One protected PDF and the password you type. The password is not stored.",
    writes: "An unlocked PDF.",
  },
  {
    slug: "find-redact-pii",
    reads: "The text layer, and the matches you confirm.",
    writes:
      "A rasterized PDF of the confirmed regions, with a pass or fail from the text layer.",
  },
  {
    slug: "redact-pdf",
    reads: "The page regions you select.",
    writes: "A PDF with those regions rasterized.",
  },
  {
    slug: "flatten-pdf",
    reads: "AcroForm fields on one PDF.",
    writes: "A PDF with field values burned into the pages.",
  },
  {
    slug: "gst-invoice",
    reads: "The seller, buyer, and line items you type.",
    writes: "A PDF invoice. The form stays in this tab.",
  },
  {
    slug: "document-integrity",
    reads: "The file bytes, hashed as SHA-256 or SHA-512.",
    writes: "A fingerprint on this page. The file on disk is unchanged.",
  },
];

export function getToolPrivacy(slug: string) {
  return toolPrivacy.find((entry) => entry.slug === slug);
}
