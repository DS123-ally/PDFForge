export const toolCategories = [
  "All",
  "Organize",
  "Convert",
  "Edit",
  "Privacy",
  "Security",
] as const;

export type ToolCategory = Exclude<(typeof toolCategories)[number], "All">;

export type ToolDefinition = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: ToolCategory;
  acceptsMultiple: boolean;
  acceptedFileTypes: Array<"pdf" | "image">;
};

export const tools: ToolDefinition[] = [
  {
    slug: "merge-pdf",
    title: "Merge PDF",
    shortDescription: "Combine multiple PDF files into one.",
    description:
      "Combine PDFs in the order you want. Everything happens locally in your browser.",
    category: "Organize",
    acceptsMultiple: true,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "private-recipes",
    title: "Private Recipes",
    shortDescription: "Chain PDF tools in one local workspace.",
    description:
      "Drop files once and run a pipeline such as merge, page numbers, watermark, strip metadata, then password protect. Save settings only if you opt in.",
    category: "Organize",
    acceptsMultiple: true,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "split-pdf",
    title: "Split PDF",
    shortDescription: "Extract pages into separate files.",
    description:
      "Choose individual pages or ranges and export them as separate PDF files.",
    category: "Organize",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "organize-pdf",
    title: "Organize PDF",
    shortDescription: "Reorder, rotate, or remove pages.",
    description:
      "Arrange PDF pages visually before saving a clean, organized copy.",
    category: "Organize",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "images-to-pdf",
    title: "Images to PDF",
    shortDescription: "Turn JPG and PNG images into a PDF.",
    description:
      "Arrange images and choose page size, orientation, margins, and fit.",
    category: "Convert",
    acceptsMultiple: true,
    acceptedFileTypes: ["image"],
  },
  {
    slug: "pdf-to-images",
    title: "PDF to Images",
    shortDescription: "Export PDF pages as JPG or PNG.",
    description:
      "Choose pages, output format, and resolution, then download images locally.",
    category: "Convert",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "rotate-pdf",
    title: "Rotate PDF",
    shortDescription: "Rotate selected pages precisely.",
    description:
      "Preview pages, choose their orientation, and save the corrected PDF.",
    category: "Edit",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "add-watermark",
    title: "Add Watermark",
    shortDescription: "Place custom text across PDF pages.",
    description:
      "Add a text watermark with opacity, position, and rotation controls.",
    category: "Edit",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "add-page-numbers",
    title: "Add Page Numbers",
    shortDescription: "Number PDF pages with flexible placement.",
    description:
      "Add page numbers locally with position, starting number, and format controls.",
    category: "Edit",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "add-headers-footers",
    title: "Add Headers and Footers",
    shortDescription: "Add repeated header and footer text.",
    description:
      "Apply simple header and footer text to every page without uploading the PDF.",
    category: "Edit",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "privacy-inspector",
    title: "Privacy Inspector",
    shortDescription: "Audit a PDF for leaks, then sanitize a local copy.",
    description:
      "Scan metadata, attachments, JavaScript, form values, leftovers, hidden text, and image EXIF on this device, then optionally write a cleaned copy.",
    category: "Privacy",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "remove-metadata",
    title: "Remove Metadata",
    shortDescription: "Clear common private document properties.",
    description:
      "Review and remove supported PDF metadata without uploading the document.",
    category: "Privacy",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "view-metadata",
    title: "View Metadata",
    shortDescription: "Inspect common PDF document properties.",
    description:
      "Read supported document metadata privately, directly in your browser.",
    category: "Privacy",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "extract-text",
    title: "Extract Text",
    shortDescription: "Copy selectable text from PDF pages.",
    description:
      "Extract available text-layer content locally. Scanned PDFs require OCR later.",
    category: "Privacy",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "password-protect-pdf",
    title: "Password Protect PDF",
    shortDescription: "Lock a PDF with AES-256 encryption.",
    description:
      "Apply ISO 32000 AES-256 password protection locally. PDFForge never stores the password.",
    category: "Security",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "unlock-pdf",
    title: "Unlock PDF",
    shortDescription: "Remove a password you already know.",
    description:
      "Open a protected PDF with the password you supply, then save an unlocked local copy.",
    category: "Security",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "redact-pdf",
    title: "Redact PDF",
    shortDescription: "Permanently remove selected page regions.",
    description:
      "Rasterize selected areas so the original text cannot be recovered from the output.",
    category: "Security",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
  {
    slug: "flatten-pdf",
    title: "Flatten PDF",
    shortDescription: "Burn form fields into the page.",
    description:
      "Flatten AcroForm fields locally so values become ordinary page content.",
    category: "Security",
    acceptsMultiple: false,
    acceptedFileTypes: ["pdf"],
  },
];

export function getTool(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}
