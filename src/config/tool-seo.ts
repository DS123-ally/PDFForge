import { tools, type ToolDefinition } from "@/config/tools";

export type ToolFaq = {
  question: string;
  answer: string;
};

export type ToolSeoContent = {
  slug: string;
  pageTitle: string;
  metaDescription: string;
  intro: string;
  steps: string[];
  faqs: ToolFaq[];
  relatedSlugs: string[];
};

export const toolSeo: ToolSeoContent[] = [
  {
    slug: "merge-pdf",
    pageTitle: "Merge PDF files locally in your browser",
    metaDescription:
      "Combine several PDFs into one file on this device. PDFForge merges pages locally with no upload, account, or watermark.",
    intro:
      "Use Merge PDF when you need a single packet from separate documents. Files stay in this tab, keep their original page sizes, and download as one PDF.",
    steps: [
      "Add two or more PDF files from your device.",
      "Reorder them with the move buttons if the sequence is wrong.",
      "Choose Merge PDFs and wait for local processing to finish.",
      "Download the combined PDF, then clear the session if you are done.",
    ],
    faqs: [
      {
        question: "Does merging upload my PDFs?",
        answer:
          "No. Merge PDF reads files with the browser File API and builds the result in a same-origin worker on this device.",
      },
      {
        question: "Can I mix page sizes in one merged file?",
        answer:
          "Yes. Each source page keeps its own dimensions. Letter, A4, and custom sizes can sit in the same output.",
      },
      {
        question: "What happens if a file is password-protected?",
        answer:
          "Merge PDF rejects encrypted files with a clear error. Unlock that file first if you know the password.",
      },
    ],
    relatedSlugs: ["split-pdf", "organize-pdf", "rotate-pdf"],
  },
  {
    slug: "split-pdf",
    pageTitle: "Split a PDF into pages or ranges",
    metaDescription:
      "Extract selected pages or ranges from a PDF in your browser. Download one file or a ZIP without sending the document to a server.",
    intro:
      "Split PDF is for pulling chapters, invoices, or single pages out of a larger file. Choose extract, custom ranges, or every page, then save locally.",
    steps: [
      "Select one PDF from your device.",
      "Pick extract, split by ranges, or split every page.",
      "Enter valid page ranges when that mode needs them.",
      "Run Split PDF and download the PDF or ZIP result.",
    ],
    faqs: [
      {
        question: "When do I get a ZIP instead of one PDF?",
        answer:
          "Range mode and every-page mode create multiple files and pack them in a ZIP. Extract mode returns a single PDF.",
      },
      {
        question: "Are overlapping ranges allowed?",
        answer:
          "No. Invalid or overlapping ranges are rejected before processing so you can correct them.",
      },
      {
        question: "Does splitting remove the unused pages from disk?",
        answer:
          "The original file on your computer is unchanged. Only the downloaded output contains the pages you asked for.",
      },
    ],
    relatedSlugs: ["merge-pdf", "organize-pdf", "extract-text"],
  },
  {
    slug: "organize-pdf",
    pageTitle: "Reorder, rotate, and delete PDF pages",
    metaDescription:
      "Organize a PDF with a page grid in your browser. Reorder, rotate, or delete pages locally and save a new file.",
    intro:
      "Organize PDF is a visual editor for page order. Thumbnails stay in this tab, keyboard controls match drag-and-drop, and undo covers recent edits in the session.",
    steps: [
      "Open one PDF to load its page thumbnails.",
      "Reorder, rotate, or delete pages as needed.",
      "Use undo if a recent change was a mistake.",
      "Save the organized PDF and download it locally.",
    ],
    faqs: [
      {
        question: "Can I restore a deleted page?",
        answer:
          "Yes, while this session is open. Undo reverses recent organize actions until you leave or clear the tool.",
      },
      {
        question: "Do rotations stay in the saved PDF?",
        answer:
          "Yes. Page rotations are written into the downloaded file, not only shown in the preview.",
      },
      {
        question: "Is there a page limit?",
        answer:
          "The limit is your device memory. Large files show a warning; only visible thumbnails render at once.",
      },
    ],
    relatedSlugs: ["rotate-pdf", "split-pdf", "merge-pdf"],
  },
  {
    slug: "images-to-pdf",
    pageTitle: "Convert JPG and PNG images to PDF",
    metaDescription:
      "Turn JPG, JPEG, and PNG files into a PDF in your browser. Choose page size, orientation, margins, and fit without uploading images.",
    intro:
      "Images to PDF builds a document from photos or scans on this device. Transparent PNGs sit on a white page, and you can reorder images before creating the file.",
    steps: [
      "Add JPG, JPEG, or PNG files.",
      "Reorder images if the page sequence should change.",
      "Set page size, orientation, margins, and fit.",
      "Create the PDF and download it locally.",
    ],
    faqs: [
      {
        question: "Which image types are supported?",
        answer:
          "JPG, JPEG, and PNG. Other formats are rejected during local validation.",
      },
      {
        question: "What happens to transparent PNG backgrounds?",
        answer:
          "Transparency is flattened onto a white page so printers and viewers show a predictable background.",
      },
      {
        question: "Can I keep each image’s original pixel size?",
        answer:
          "Yes. Choose original-size layout when you do not want A4 or Letter fitting.",
      },
    ],
    relatedSlugs: ["pdf-to-images", "merge-pdf", "rotate-pdf"],
  },
  {
    slug: "pdf-to-images",
    pageTitle: "Export PDF pages as JPG or PNG",
    metaDescription:
      "Rasterize PDF pages to JPG or PNG in your browser. Select pages, set resolution, and download files or a ZIP locally.",
    intro:
      "PDF to Images is for previews, slides, or archives that need pictures instead of a PDF. Rendering happens on this device and can use more memory at high resolution.",
    steps: [
      "Select a PDF from your device.",
      "Choose JPG or PNG and the pages to export.",
      "Set resolution or quality, noting the large-export warning.",
      "Download individual images or a ZIP of every selected page.",
    ],
    faqs: [
      {
        question: "Is the output searchable text?",
        answer:
          "No. This tool rasterizes pages into images. Use Extract Text if you need the text layer.",
      },
      {
        question: "Why is there a high-resolution warning?",
        answer:
          "Large canvases can exhaust mobile memory. Lower DPI if the browser slows down or the export fails.",
      },
      {
        question: "Are filenames in the ZIP consistent?",
        answer:
          "Yes. Pages are named in a stable page-number pattern so you can sort them after download.",
      },
    ],
    relatedSlugs: ["images-to-pdf", "extract-text", "split-pdf"],
  },
  {
    slug: "rotate-pdf",
    pageTitle: "Rotate selected PDF pages locally",
    metaDescription:
      "Rotate some or all PDF pages by 90, 180, or 270 degrees in your browser. Preview first and save a corrected copy on this device.",
    intro:
      "Rotate PDF fixes sideways scans without reprinting. You can target custom pages, preview the change, then download a new file.",
    steps: [
      "Select the PDF that needs rotation.",
      "Choose all pages or enter a custom page list.",
      "Pick 90, 180, or 270 degrees and preview.",
      "Rotate locally and download the result.",
    ],
    faqs: [
      {
        question: "Does rotation change page size?",
        answer:
          "The media box stays the same; content is rotated. A landscape page rotated 90 degrees appears portrait.",
      },
      {
        question: "Can I rotate only page 2?",
        answer:
          "Yes. Use custom pages and enter 2, or a range such as 2-4.",
      },
      {
        question: "Is this the same as Organize PDF?",
        answer:
          "Rotate PDF is for orientation only. Organize PDF also reorders and deletes pages.",
      },
    ],
    relatedSlugs: ["organize-pdf", "add-watermark", "merge-pdf"],
  },
  {
    slug: "add-watermark",
    pageTitle: "Add a text watermark to a PDF",
    metaDescription:
      "Stamp text across PDF pages in your browser. Control opacity, position, and rotation locally without uploading the file.",
    intro:
      "Add Watermark is for draft, confidential, or sample labels. The mark is drawn as page content you can preview before saving.",
    steps: [
      "Open the PDF you want to mark.",
      "Enter watermark text and set opacity, position, and rotation.",
      "Preview the stamp on a page.",
      "Process locally and download the watermarked PDF.",
    ],
    faqs: [
      {
        question: "Is a watermark the same as encryption?",
        answer:
          "No. A watermark is visible labeling. Use Password Protect PDF if you need AES-256 access control.",
      },
      {
        question: "Can I use an image logo instead of text?",
        answer:
          "This tool stamps text only. Image watermarks are not in the current local feature set.",
      },
      {
        question: "Does PDFForge add its own watermark?",
        answer:
          "No. Output contains only the text you enter.",
      },
    ],
    relatedSlugs: ["add-headers-footers", "add-page-numbers", "rotate-pdf"],
  },
  {
    slug: "add-page-numbers",
    pageTitle: "Number PDF pages in your browser",
    metaDescription:
      "Add page numbers to a PDF locally. Choose position, starting number, and format without uploading the document.",
    intro:
      "Add Page Numbers is for packets that need a printed index. Numbers are drawn on each page you include, with a preview before you save.",
    steps: [
      "Select a PDF.",
      "Choose position, starting number, and number format.",
      "Preview how the numbers sit on the page.",
      "Apply numbering locally and download the file.",
    ],
    faqs: [
      {
        question: "Can numbering start at 5?",
        answer:
          "Yes. Set the starting number so the first processed page shows 5, then increments.",
      },
      {
        question: "Will numbers cover existing footers?",
        answer:
          "They draw on top of page content at the position you pick. Move them if they collide with existing text.",
      },
      {
        question: "Are Roman numerals supported?",
        answer:
          "Use the format control for the styles this tool offers. Unsupported styles are not listed in the menu.",
      },
    ],
    relatedSlugs: ["add-headers-footers", "add-watermark", "organize-pdf"],
  },
  {
    slug: "add-headers-footers",
    pageTitle: "Add PDF headers and footers locally",
    metaDescription:
      "Place repeated header and footer text on PDF pages in your browser. Preview the layout, then save a copy on this device.",
    intro:
      "Headers and footers are for titles, dates, or file names that should appear on every page. The text is drawn locally and is not a metadata field.",
    steps: [
      "Open a PDF.",
      "Enter header and footer text.",
      "Preview placement on a sample page.",
      "Apply the text locally and download the result.",
    ],
    faqs: [
      {
        question: "Is header text stored as PDF metadata?",
        answer:
          "No. It is visible page content. Use View Metadata or Remove Metadata for document properties.",
      },
      {
        question: "Can the header differ on page 1?",
        answer:
          "This tool applies the same header and footer to the pages you process. Per-page exceptions are not included.",
      },
      {
        question: "Will this replace page numbers?",
        answer:
          "It can overlap numbers if both sit in the same corner. Place headers away from numbering or run one tool at a time.",
      },
    ],
    relatedSlugs: ["add-page-numbers", "add-watermark", "rotate-pdf"],
  },
  {
    slug: "remove-metadata",
    pageTitle: "Remove PDF metadata on your device",
    metaDescription:
      "Clear common PDF document properties in your browser. Title, author, and similar fields are stripped locally; visible page content stays.",
    intro:
      "Remove Metadata is a privacy cleanup for properties stored in the file catalog. It does not redact sentences on the page. Confirm the download no longer lists those fields.",
    steps: [
      "Select a PDF.",
      "Review which common properties this tool can clear.",
      "Run Remove Metadata locally.",
      "Download the cleaned file and optionally View Metadata to confirm.",
    ],
    faqs: [
      {
        question: "Does this hide text on the pages?",
        answer:
          "No. Only supported metadata fields are removed. Use Redact PDF to permanently remove visible regions.",
      },
      {
        question: "Which fields are cleared?",
        answer:
          "Common catalog properties such as title, author, subject, keywords, and producer where the file stores them.",
      },
      {
        question: "Are hidden attachments deleted?",
        answer:
          "This tool targets metadata, not embedded files. Attachments may remain.",
      },
    ],
    relatedSlugs: ["view-metadata", "extract-text", "redact-pdf"],
  },
  {
    slug: "view-metadata",
    pageTitle: "Inspect PDF metadata privately",
    metaDescription:
      "Read common PDF properties such as title and author in your browser. Nothing is uploaded and no output file is required.",
    intro:
      "View Metadata shows what the file claims about itself. Use it before sharing, or after Remove Metadata, to confirm what is still stored.",
    steps: [
      "Choose a PDF from your device.",
      "Select View metadata.",
      "Read the listed properties in this tab.",
      "Clear the file when you are finished. Nothing is sent away.",
    ],
    faqs: [
      {
        question: "Does viewing metadata create a download?",
        answer:
          "No. The tool only displays supported fields from the local file.",
      },
      {
        question: "Why is a field blank?",
        answer:
          "The PDF may not store that property, or it may use a structure this reader does not map.",
      },
      {
        question: "Can I edit metadata here?",
        answer:
          "Viewing is read-only. Remove Metadata clears supported fields; it does not offer arbitrary tag editing.",
      },
    ],
    relatedSlugs: ["remove-metadata", "extract-text", "password-protect-pdf"],
  },
  {
    slug: "extract-text",
    pageTitle: "Extract text from a PDF locally",
    metaDescription:
      "Copy selectable text-layer content from a PDF in your browser. Scanned pages without a text layer need OCR, which PDFForge does not provide.",
    intro:
      "Extract Text is for quotes, invoices, or notes already stored as text in the PDF. It does not reconstruct tables from images or run optical character recognition.",
    steps: [
      "Select a PDF that contains a text layer.",
      "Run Extract text.",
      "Review the text in this tab.",
      "Copy what you need, then clear the file.",
    ],
    faqs: [
      {
        question: "Why is the result empty?",
        answer:
          "The file may be a scan with no text layer. This tool cannot OCR images of pages.",
      },
      {
        question: "Is extracted text uploaded for analysis?",
        answer:
          "No. Text is read with PDF.js in this browser and never sent to PDFForge servers.",
      },
      {
        question: "Does order match the visual layout?",
        answer:
          "Order follows the PDF text layer, which can differ from how columns look on screen.",
      },
    ],
    relatedSlugs: ["view-metadata", "pdf-to-images", "split-pdf"],
  },
  {
    slug: "password-protect-pdf",
    pageTitle: "Password-protect a PDF with AES-256",
    metaDescription:
      "Lock a PDF with AES-256 encryption in your browser. PDFForge never stores or logs the password and does not upload the file.",
    intro:
      "Password Protect PDF writes an encrypted copy using AES-256. Keep the password yourself; there is no account recovery if you forget it.",
    steps: [
      "Select an unlocked PDF.",
      "Enter and confirm an open password.",
      "Protect the file locally.",
      "Download the encrypted PDF and store the password separately.",
    ],
    faqs: [
      {
        question: "Is this really AES-256?",
        answer:
          "Yes. PDFForge uses pdf-lib-encrypt with AES-256. We do not claim AES-256 for other algorithms.",
      },
      {
        question: "Where is the password stored?",
        answer:
          "Only in memory for this operation. It is not written to logs, IndexedDB, or the service worker cache.",
      },
      {
        question: "Can I set owner and user passwords separately?",
        answer:
          "This tool applies the open password you enter. Distinct permission passwords are not offered.",
      },
    ],
    relatedSlugs: ["unlock-pdf", "flatten-pdf", "redact-pdf"],
  },
  {
    slug: "unlock-pdf",
    pageTitle: "Unlock a PDF with a password you know",
    metaDescription:
      "Remove password protection from a PDF in your browser when you supply the correct password. Wrong passwords fail locally without a server check.",
    intro:
      "Unlock PDF is for files you are allowed to open. AES-256 files that this stack supports become an unlocked download. Some AES-128 or unusual encodings cannot be rewritten as a vector PDF.",
    steps: [
      "Add the password-protected PDF.",
      "Enter the password you already know.",
      "Unlock the file locally.",
      "Download the unlocked copy if the password is accepted.",
    ],
    faqs: [
      {
        question: "What if the password is wrong?",
        answer:
          "The tool reports a wrong-password error. Nothing is uploaded and guessing is not done for you.",
      },
      {
        question: "Can PDFForge crack a password?",
        answer:
          "No. You must already know the password. Unlocking without it is not supported.",
      },
      {
        question: "Why might unlock still fail?",
        answer:
          "Some encryption revisions are unsupported. The UI explains when a file cannot be rewritten.",
      },
    ],
    relatedSlugs: ["password-protect-pdf", "flatten-pdf", "view-metadata"],
  },
  {
    slug: "redact-pdf",
    pageTitle: "Redact PDF regions permanently",
    metaDescription:
      "Black out selected PDF areas by rasterizing those pages in your browser. Covered text is removed from the output text layer, not merely hidden.",
    intro:
      "Redact PDF is for irreversible removal of a region. Drawing a box without rasterizing would be unsafe, so selected pages are rebuilt as images with black fills.",
    steps: [
      "Open the PDF that contains sensitive regions.",
      "Select a page and mark the area to remove.",
      "Confirm the redaction preview.",
      "Process locally and download the redacted PDF.",
    ],
    faqs: [
      {
        question: "Can someone recover redacted text?",
        answer:
          "The selected region is rasterized and filled, so that text should not remain in the output text layer. Always spot-check the download.",
      },
      {
        question: "Why does the page become an image?",
        answer:
          "Permanent redaction requires replacing page content. Selectable text on that page is discarded by design.",
      },
      {
        question: "Does this replace metadata cleaning?",
        answer:
          "No. Redaction targets visible regions. Run Remove Metadata separately if properties also need clearing.",
      },
    ],
    relatedSlugs: ["flatten-pdf", "remove-metadata", "password-protect-pdf"],
  },
  {
    slug: "flatten-pdf",
    pageTitle: "Flatten PDF form fields locally",
    metaDescription:
      "Burn AcroForm fields into PDF pages in your browser so values become ordinary content. Processing stays on this device.",
    intro:
      "Flatten PDF is for completed forms you want to lock visually. Field widgets are flattened with pdf-lib. Not every annotation appearance is guaranteed.",
    steps: [
      "Select a PDF that contains AcroForm fields.",
      "Review that you want values baked into the pages.",
      "Flatten the form locally.",
      "Download the flattened PDF.",
    ],
    faqs: [
      {
        question: "Can I edit fields after flattening?",
        answer:
          "Filled values become page content. Recipients generally cannot type into those widgets anymore.",
      },
      {
        question: "Are comments and markup fully flattened?",
        answer:
          "This tool focuses on AcroForm fields. Remaining annotations may still exist.",
      },
      {
        question: "Does flattening encrypt the file?",
        answer:
          "No. Use Password Protect PDF if the flattened file also needs a password.",
      },
    ],
    relatedSlugs: ["redact-pdf", "password-protect-pdf", "remove-metadata"],
  },
];

export function getToolSeo(slug: string) {
  return toolSeo.find((entry) => entry.slug === slug);
}

export function getRelatedTools(slug: string): ToolDefinition[] {
  const seo = getToolSeo(slug);

  if (!seo) {
    return [];
  }

  return seo.relatedSlugs
    .map((relatedSlug) => tools.find((tool) => tool.slug === relatedSlug))
    .filter((tool): tool is ToolDefinition => Boolean(tool));
}

export function listToolSeo() {
  return toolSeo;
}

export function assertToolSeoCoverage() {
  return tools.every((tool) => Boolean(getToolSeo(tool.slug)));
}
