import { cn } from "@/lib/utils";

export const formatLogos = [
  { detail: "Merge, edit, redact, and lock", label: "PDF", name: "PDF" },
  { detail: ".docx text in and out", label: "W", name: "Word" },
  { detail: "Cells become a PDF table", label: "X", name: "Excel" },
  { detail: "Slide text, one page each", label: "P", name: "PowerPoint" },
  { detail: "JPG and PNG into pages", label: "IMG", name: "Images" },
  { detail: "Rows and columns, no charts", label: "CSV", name: "CSV" },
  { detail: "Markdown into PDF text", label: "MD", name: "Markdown" },
  { detail: "Pages saved as a local file", label: "</>", name: "HTML" },
] as const;

export type FormatName = (typeof formatLogos)[number]["name"];

const marks: Record<FormatName, { bg: string; fg: string }> = {
  CSV: { bg: "#0f766e", fg: "#ffffff" },
  Excel: { bg: "#217346", fg: "#ffffff" },
  HTML: { bg: "#c2410c", fg: "#ffffff" },
  Images: { bg: "#6d28d9", fg: "#ffffff" },
  Markdown: { bg: "#18181b", fg: "#ffffff" },
  PDF: { bg: "#ef2f2f", fg: "#ffffff" },
  PowerPoint: { bg: "#d24726", fg: "#ffffff" },
  Word: { bg: "#2b579a", fg: "#ffffff" },
};

export function FormatLogo({
  className,
  name,
}: {
  className?: string;
  name: FormatName;
}) {
  const format = formatLogos.find((item) => item.name === name) ?? formatLogos[0];
  const mark = marks[format.name];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-14 place-items-center rounded-2xl shadow-sm ring-1 ring-black/5",
        className,
      )}
      style={{ backgroundColor: mark.bg, color: mark.fg }}
    >
      <svg fill="none" height="32" viewBox="0 0 32 32" width="32">
        {format.name === "PDF" ? <PdfGlyph /> : null}
        {format.name === "Word" ? <WordGlyph /> : null}
        {format.name === "Excel" ? <ExcelGlyph /> : null}
        {format.name === "PowerPoint" ? <SlideGlyph /> : null}
        {format.name === "Images" ? <ImageGlyph /> : null}
        {format.name === "CSV" ? <TableGlyph /> : null}
        {format.name === "Markdown" ? <MarkdownGlyph /> : null}
        {format.name === "HTML" ? <HtmlGlyph /> : null}
      </svg>
    </span>
  );
}

function PdfGlyph() {
  return (
    <>
      <path
        d="M8 5.5h10.2L24 11.2V25a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 7 25V7A1.5 1.5 0 0 1 8.5 5.5H8Z"
        fill="white"
      />
      <path d="M18.2 5.5 24 11.2h-4.3A1.5 1.5 0 0 1 18.2 9.7V5.5Z" fill="#fecaca" />
      <path
        d="M10.2 18.2h2.1c1.15 0 1.85.62 1.85 1.52 0 .92-.7 1.54-1.85 1.54h-1.2V22.8h-1.1v-4.6Zm1.1.86v1.34h.9c.55 0 .86-.24.86-.67s-.31-.67-.86-.67h-.9Zm3.55-.86h1.15c1.55 0 2.55.9 2.55 2.3 0 1.42-1 2.32-2.55 2.32h-1.15v-4.62Zm1.1.86v2.9h.12c.9 0 1.42-.52 1.42-1.45 0-.94-.52-1.45-1.42-1.45h-.12Zm4.15-.86h3.35v.86h-2.25v1.05h2.05v.84h-2.05v1.87h-1.1v-4.62Z"
        fill="#ef2f2f"
      />
    </>
  );
}

function WordGlyph() {
  return (
    <path
      d="M7 8.2 12.2 6l10.3 2.1v15.8L12.2 26 7 23.8V8.2Zm6.35 12.15 1.55-6.55 1.5 6.55h1.25l2.15-8.7h-1.35l-1.25 6.15-1.5-6.15h-1.2l-1.55 6.15-1.2-6.15H9.4l2.2 8.7h1.75Z"
      fill="white"
    />
  );
}

function ExcelGlyph() {
  return (
    <>
      <rect fill="white" height="18" rx="2" width="20" x="6" y="7" />
      <path
        d="M11.2 11.2h2.2l2.6 4.15 2.6-4.15h2.15L16.7 16l4.2 4.8h-2.25l-2.65-3.35-2.65 3.35H11l4.15-4.8-3.95-4.8Z"
        fill="#217346"
      />
    </>
  );
}

function SlideGlyph() {
  return (
    <>
      <rect fill="white" height="14" rx="1.5" width="18" x="7" y="8" />
      <path d="M14 22h4M16 22v3" stroke="white" strokeWidth="1.6" />
      <path d="M11 15.5h6.5M11 12.5h4" stroke="#d24726" strokeWidth="1.6" />
    </>
  );
}

function ImageGlyph() {
  return (
    <>
      <rect fill="white" height="16" rx="2" width="18" x="7" y="8" />
      <circle cx="12.5" cy="13" fill="#6d28d9" r="1.4" />
      <path d="m9.5 21 4.2-4.4 2.4 2.3 1.6-1.5 4.8 4.6H9.5Z" fill="#6d28d9" />
    </>
  );
}

function TableGlyph() {
  return (
    <>
      <rect fill="white" height="16" rx="2" width="18" x="7" y="8" />
      <path d="M7 13.2h18M13 8v16M19 8v16" stroke="#0f766e" strokeWidth="1.4" />
    </>
  );
}

function MarkdownGlyph() {
  return (
    <path
      d="M8 10h3.2l2.3 3.4L16 10h3.2v12H16v-6.2L13.5 19 11 15.8V22H8V10Zm14.2 6.2 2.8-3.2H22v-3h-3.2v3H16l2.8 3.2 3.4-3.2Z"
      fill="white"
    />
  );
}

function HtmlGlyph() {
  return (
    <path
      d="M10.2 9.5 7 16l3.2 6.5h2.2L9.6 16l2.8-6.5h-2.2Zm11.6 0h-2.2L22.4 16l-2.8 6.5h2.2L25 16l-3.2-6.5ZM14.2 20.8l1.6-9.6h1.7l-1.6 9.6h-1.7Z"
      fill="white"
    />
  );
}
