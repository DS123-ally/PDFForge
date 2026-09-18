import { looksLikeTable, type ConvertPage } from "@/lib/convert/layout";
import { escapeXml, toBase64 } from "@/lib/convert/xml";

export function buildHtml(pages: readonly ConvertPage[], title: string) {
  const sections = pages
    .map((page) => {
      const image = page.png
        ? `<img alt="Page ${page.pageNumber}" src="data:image/png;base64,${toBase64(page.png)}"/>`
        : "";
      const body = looksLikeTable(page.lines)
        ? htmlTable(page.lines.map((line) => line.cells))
        : page.lines.length === 0
          ? `<p class="empty">(No selectable text on this page.)</p>`
          : page.lines.map((line) => `<p>${escapeXml(line.text)}</p>`).join("");

      return `<section aria-label="Page ${page.pageNumber}">
  <h2>Page ${page.pageNumber}</h2>
  ${image}
  ${body}
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeXml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0 auto; max-width: 52rem; padding: 2rem 1.25rem 4rem; font: 16px/1.5 system-ui, sans-serif; color: #18181b; }
    h1, h2 { font-weight: 800; }
    h1 { font-size: 1.75rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; }
    p { margin: 0.35rem 0; }
    img { display: block; max-width: 100%; height: auto; border: 1px solid #e4e4e7; border-radius: 0.75rem; margin: 0.75rem 0 1rem; }
    table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1.25rem; }
    th, td { border: 1px solid #d4d4d8; padding: 0.4rem 0.55rem; text-align: left; vertical-align: top; }
    .empty { color: #71717a; }
    .note { color: #52525b; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <p class="note">Converted locally with PDFForge. Layout follows the PDF text layer; scanned pages without selectable text may be empty unless page pictures were included.</p>
  ${sections}
</body>
</html>
`;
}

function htmlTable(rows: readonly string[][]) {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const body = rows
    .map((row) => {
      const cells = Array.from(
        { length: columnCount },
        (_, index) => `<td>${escapeXml(row[index] ?? "")}</td>`,
      ).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table><tbody>${body}</tbody></table>`;
}
