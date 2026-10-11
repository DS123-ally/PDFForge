export type IndustryPage = {
  description: string;
  intro: string;
  matchingNote: string;
  matchingPresetId: string;
  navLabel: string;
  presetId: string;
  slug: string;
  title: string;
  toolLinks: Array<{ href: string; label: string }>;
};

export const industries: readonly IndustryPage[] = [
  {
    slug: "ca-firms",
    navLabel: "CA firms",
    title: "PDFForge for CA firms",
    description:
      "Send client papers outside the firm with the Send externally recipe. Number a packet merges and numbers a set in the browser.",
    intro:
      "Client returns, GST workings, and filing sets often leave the office. Send externally is the recipe to open first. It strips metadata, redacts confirmed identifiers, flattens the pages, watermarks the copy, and password-protects it in this browser. After redaction, the workspace shows a pass or fail from the text layer.",
    presetId: "send-externally",
    matchingPresetId: "number-a-packet",
    matchingNote:
      "Use Number a packet when the job is a merged, numbered set of PDFs.",
    toolLinks: [
      { href: "/tools/gst-invoice", label: "GST Invoice" },
      { href: "/tools/privacy-risk-scanner", label: "Privacy Risk Scanner" },
    ],
  },
  {
    slug: "law-firms",
    navLabel: "Law firms",
    title: "PDFForge for law firms",
    description:
      "Prepare a copy you can send out with Send externally. Redact a copy finds confirmed identifiers and flattens the pages in the browser.",
    intro:
      "Briefs, bundles, and correspondence can carry names, numbers, and hidden properties. Send externally is the recipe to open first. It strips metadata, redacts confirmed identifiers, flattens the pages, watermarks the copy, and password-protects it in this browser. After redaction, the workspace shows a pass or fail from the text layer.",
    presetId: "send-externally",
    matchingPresetId: "redact-a-copy",
    matchingNote:
      "Use Redact a copy when you need confirmed hits removed and the pages flattened.",
    toolLinks: [
      { href: "/tools/find-redact-pii", label: "Find and Redact PII" },
      { href: "/tools/redact-pdf", label: "Redact PDF" },
    ],
  },
  {
    slug: "hr",
    navLabel: "HR",
    title: "PDFForge for HR",
    description:
      "Share a staff document with the Send externally recipe. Clean a copy strips properties, attachments, scripts, and form values in the browser.",
    intro:
      "Offer letters, policies, and employee packets often leave HR with more in the file than the page shows. Send externally is the recipe to open first. It strips metadata, redacts confirmed identifiers, flattens the pages, watermarks the copy, and password-protects it in this browser. After redaction, the workspace shows a pass or fail from the text layer.",
    presetId: "send-externally",
    matchingPresetId: "clean-a-copy",
    matchingNote:
      "Use Clean a copy when you want properties, attachments, scripts, form values, and image EXIF removed from a shareable PDF.",
    toolLinks: [
      { href: "/tools/privacy-inspector", label: "Privacy Inspector" },
      { href: "/tools/remove-metadata", label: "Remove Metadata" },
    ],
  },
];

export function getIndustry(slug: string) {
  return industries.find((page) => page.slug === slug);
}
