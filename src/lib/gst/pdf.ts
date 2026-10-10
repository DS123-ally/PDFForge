import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import {
  amountInWords,
  calculateInvoice,
  formatAddress,
  formatInvoiceDate,
  formatInr,
  invoiceKindLabel,
  supplyLabel,
  type GstInvoice,
  type InvoiceTotals,
  type SupplyMode,
} from "@/lib/gst/invoice";
import { stateName } from "@/lib/gst/states";
import { savePdf } from "@/lib/pdf/save-pdf";

export type GstInvoiceLogo = {
  bytes: Uint8Array;
  mimeType: string;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 36;
const ink = rgb(0.09, 0.09, 0.11);
const muted = rgb(0.35, 0.35, 0.38);
const line = rgb(0.82, 0.82, 0.85);
const paper = rgb(0.97, 0.97, 0.96);
const red = rgb(0.86, 0.15, 0.15);

export async function buildGstInvoicePdf(
  invoice: GstInvoice,
  logo?: GstInvoiceLogo,
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const totals = calculateInvoice(invoice);
  const embedded = await embedLogo(pdf, logo);
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = drawHeader(page, invoice, font, bold, embedded);

  y = drawParties(page, invoice, font, bold, y, totals.mode);
  y = drawTableHeader(page, font, bold, y, totals.mode);

  totals.lines.forEach((item, index) => {
    if (y < margin + 150) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      y = drawTableHeader(page, font, bold, y, totals.mode);
    }

    drawRow(page, font, y, totals.mode, index, item);
    y -= 22;
  });

  if (y < margin + 180) {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  y = drawTotals(page, font, bold, y, totals);
  drawFooter(page, invoice, font, bold, y);

  return savePdf(pdf);
}

function drawHeader(
  page: PDFPage,
  invoice: GstInvoice,
  font: PDFFont,
  bold: PDFFont,
  logo: PDFImage | null,
) {
  page.drawRectangle({
    color: ink,
    height: 72,
    width: pageWidth,
    x: 0,
    y: pageHeight - 72,
  });
  page.drawRectangle({
    color: red,
    height: 4,
    width: pageWidth,
    x: 0,
    y: pageHeight - 76,
  });

  let textX = margin;

  if (logo) {
    page.drawImage(logo, {
      height: 40,
      width: 40,
      x: margin,
      y: pageHeight - 56,
    });
    textX = margin + 50;
  }

  const title =
    invoice.seller.tradeName.trim() ||
    invoice.seller.legalName.trim() ||
    "GST Invoice";

  page.drawText(pdfText(title).slice(0, 42), {
    color: rgb(1, 1, 1),
    font: bold,
    size: 16,
    x: textX,
    y: pageHeight - 34,
  });
  page.drawText(pdfText(invoiceKindLabel(invoice.invoice.kind)), {
    color: rgb(0.95, 0.8, 0.8),
    font,
    size: 9,
    x: textX,
    y: pageHeight - 50,
  });
  page.drawText(pdfText(`No. ${invoice.invoice.number || "—"}`), {
    color: rgb(1, 1, 1),
    font: bold,
    size: 11,
    x: pageWidth - margin - 160,
    y: pageHeight - 32,
  });
  page.drawText(
    pdfText(`Date ${formatInvoiceDate(invoice.invoice.date) || "—"}`),
    {
      color: rgb(0.9, 0.9, 0.92),
      font,
      size: 9,
      x: pageWidth - margin - 160,
      y: pageHeight - 48,
    },
  );

  return pageHeight - 96;
}

function drawParties(
  page: PDFPage,
  invoice: GstInvoice,
  font: PDFFont,
  bold: PDFFont,
  y: number,
  mode: SupplyMode,
) {
  const columnWidth = (pageWidth - margin * 2 - 16) / 2;

  drawParty(page, font, bold, margin, y, "Supplier", supplierLines(invoice));
  drawParty(
    page,
    font,
    bold,
    margin + columnWidth + 16,
    y,
    "Buyer",
    buyerLines(invoice),
  );

  const next = y - 118;

  page.drawText(
    pdfText(
      `Place of supply: ${stateName(invoice.invoice.placeOfSupply) || "—"}   ·   ${supplyLabel(mode)}   ·   Reverse charge: ${invoice.invoice.reverseCharge ? "Yes" : "No"}`,
    ).slice(0, 140),
    { color: muted, font, size: 8, x: margin, y: next },
  );

  return next - 16;
}

function drawParty(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  x: number,
  y: number,
  label: string,
  lines: string[],
) {
  page.drawText(label.toUpperCase(), { color: red, font: bold, size: 8, x, y });
  lines.slice(0, 6).forEach((entry, index) => {
    page.drawText(pdfText(entry).slice(0, 62), {
      color: index === 0 ? ink : muted,
      font: index === 0 ? bold : font,
      size: index === 0 ? 10 : 8,
      x,
      y: y - 16 - index * 12,
    });
  });
}

function drawTableHeader(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  y: number,
  mode: SupplyMode,
) {
  page.drawRectangle({
    color: paper,
    height: 18,
    width: pageWidth - margin * 2,
    x: margin,
    y: y - 14,
  });

  let x = margin + 4;

  for (const column of tableColumns(mode)) {
    page.drawText(column.label, {
      color: ink,
      font: bold,
      size: 7,
      x:
        column.align === "right"
          ? x + column.width - bold.widthOfTextAtSize(column.label, 7) - 6
          : x,
      y: y - 9,
    });
    x += column.width;
  }

  return y - 22;
}

function drawRow(
  page: PDFPage,
  font: PDFFont,
  y: number,
  mode: SupplyMode,
  index: number,
  item: InvoiceTotals["lines"][number],
) {
  const values = rowValues(mode, index, item);
  let x = margin + 4;

  page.drawLine({
    color: line,
    end: { x: pageWidth - margin, y: y - 16 },
    start: { x: margin, y: y - 16 },
    thickness: 0.4,
  });

  tableColumns(mode).forEach((column, columnIndex) => {
    const text = pdfText(values[columnIndex] ?? "").slice(
      0,
      column.key === "desc" ? 32 : 16,
    );

    page.drawText(text, {
      color: ink,
      font,
      size: 8,
      x:
        column.align === "right"
          ? x + column.width - font.widthOfTextAtSize(text, 8) - 6
          : x,
      y: y - 10,
    });
    x += column.width;
  });
}

function drawTotals(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  y: number,
  totals: InvoiceTotals,
) {
  let cursor = y - 8;
  const labelX = pageWidth - margin - 210;
  const valueX = pageWidth - margin;

  for (const row of totalRows(totals)) {
    const value = pdfText(row.value);
    const size = row.emphasis ? 11 : 9;

    page.drawText(row.label, {
      color: row.emphasis ? ink : muted,
      font: row.emphasis ? bold : font,
      size,
      x: labelX,
      y: cursor,
    });
    page.drawText(value, {
      color: ink,
      font: row.emphasis ? bold : font,
      size,
      x: valueX - font.widthOfTextAtSize(value, size),
      y: cursor,
    });
    cursor -= row.emphasis ? 18 : 14;
  }

  const words = wrapText(
    amountInWords(totals.total),
    font,
    8,
    pageWidth - margin * 2,
  );

  cursor -= 6;
  page.drawText("Amount in words", {
    color: muted,
    font,
    size: 8,
    x: margin,
    y: cursor,
  });
  cursor -= 12;

  for (const wordLine of words.slice(0, 2)) {
    page.drawText(pdfText(wordLine), {
      color: ink,
      font: bold,
      size: 8,
      x: margin,
      y: cursor,
    });
    cursor -= 12;
  }

  return cursor;
}

function drawFooter(
  page: PDFPage,
  invoice: GstInvoice,
  font: PDFFont,
  bold: PDFFont,
  y: number,
) {
  const notes = [
    invoice.other.bankName ? `Bank: ${invoice.other.bankName}` : "",
    invoice.other.accountName
      ? `Account name: ${invoice.other.accountName}`
      : "",
    invoice.other.accountNumber ? `A/c: ${invoice.other.accountNumber}` : "",
    invoice.other.ifsc ? `IFSC: ${invoice.other.ifsc}` : "",
    invoice.other.upi ? `UPI: ${invoice.other.upi}` : "",
    invoice.other.notes ? `Notes: ${invoice.other.notes}` : "",
    invoice.other.terms ? `Terms: ${invoice.other.terms}` : "",
  ].filter(Boolean);
  let cursor = Math.min(y - 8, 150);

  for (const note of notes) {
    for (const wrapped of wrapText(note, font, 8, 340).slice(0, 2)) {
      if (cursor < margin + 28) {
        return;
      }

      page.drawText(pdfText(wrapped), {
        color: muted,
        font,
        size: 8,
        x: margin,
        y: cursor,
      });
      cursor -= 11;
    }
  }

  page.drawText(pdfText(invoice.invoice.signatory || "Authorised signatory"), {
    color: ink,
    font: bold,
    size: 9,
    x: pageWidth - margin - 160,
    y: margin + 28,
  });
  page.drawText("This invoice was created locally in your browser.", {
    color: muted,
    font,
    size: 7,
    x: margin,
    y: 18,
  });
}

function supplierLines(invoice: GstInvoice) {
  return [
    invoice.seller.legalName.trim() ||
      invoice.seller.tradeName.trim() ||
      "Supplier",
    invoice.seller.gstin ? `GSTIN ${invoice.seller.gstin}` : "",
    invoice.seller.pan ? `PAN ${invoice.seller.pan}` : "",
    ...formatAddress(invoice.seller),
    [invoice.seller.phone, invoice.seller.email].filter(Boolean).join(" · "),
  ].filter(Boolean);
}

function buyerLines(invoice: GstInvoice) {
  return [
    invoice.buyer.name.trim() || "Buyer",
    invoice.buyer.gstin ? `GSTIN ${invoice.buyer.gstin}` : "Unregistered",
    ...formatAddress(invoice.buyer),
    [invoice.buyer.phone, invoice.buyer.email].filter(Boolean).join(" · "),
  ].filter(Boolean);
}

function tableColumns(mode: SupplyMode) {
  const shared = [
    { align: "left" as const, key: "n", label: "#", width: 20 },
    { align: "left" as const, key: "desc", label: "Description", width: 128 },
    { align: "left" as const, key: "hsn", label: "HSN/SAC", width: 52 },
    { align: "right" as const, key: "qty", label: "Qty", width: 44 },
    { align: "right" as const, key: "rate", label: "Rate", width: 54 },
    { align: "right" as const, key: "taxable", label: "Taxable", width: 58 },
  ];

  if (mode === "intra") {
    return [
      ...shared,
      { align: "right" as const, key: "cgst", label: "CGST", width: 52 },
      { align: "right" as const, key: "sgst", label: "SGST", width: 52 },
      { align: "right" as const, key: "total", label: "Amount", width: 58 },
    ];
  }

  if (mode === "bill") {
    return [
      { align: "left" as const, key: "n", label: "#", width: 24 },
      { align: "left" as const, key: "desc", label: "Description", width: 196 },
      { align: "left" as const, key: "hsn", label: "HSN/SAC", width: 70 },
      { align: "right" as const, key: "qty", label: "Qty", width: 60 },
      { align: "right" as const, key: "rate", label: "Rate", width: 74 },
      { align: "right" as const, key: "total", label: "Amount", width: 90 },
    ];
  }

  return [
    ...shared,
    {
      align: "right" as const,
      key: "tax",
      label: mode === "inter" ? "IGST" : "GST",
      width: 78,
    },
    { align: "right" as const, key: "total", label: "Amount", width: 80 },
  ];
}

function rowValues(
  mode: SupplyMode,
  index: number,
  item: InvoiceTotals["lines"][number],
) {
  const qty = `${trimNumber(item.quantity)} ${item.unit}`.trim();

  if (mode === "intra") {
    return [
      String(index + 1),
      item.description,
      item.hsn,
      qty,
      money(item.rate),
      money(item.taxable),
      money(item.cgst),
      money(item.sgst),
      money(item.total),
    ];
  }

  if (mode === "bill") {
    return [
      String(index + 1),
      item.description,
      item.hsn,
      qty,
      money(item.rate),
      money(item.total),
    ];
  }

  return [
    String(index + 1),
    item.description,
    item.hsn,
    qty,
    money(item.rate),
    money(item.taxable),
    money(item.tax),
    money(item.total),
  ];
}

function totalRows(totals: InvoiceTotals) {
  const rows = [
    { emphasis: false, label: "Taxable value", value: money(totals.taxable) },
  ];

  if (totals.mode === "intra") {
    rows.push(
      { emphasis: false, label: "CGST", value: money(totals.cgst) },
      { emphasis: false, label: "SGST", value: money(totals.sgst) },
    );
  } else if (totals.mode === "inter") {
    rows.push({ emphasis: false, label: "IGST", value: money(totals.igst) });
  } else if (totals.mode === "unknown") {
    rows.push({ emphasis: false, label: "GST", value: money(totals.tax) });
  }

  rows.push({
    emphasis: true,
    label: "Grand total",
    value: money(totals.total),
  });

  return rows;
}

function money(amount: number) {
  return formatInr(amount).replace("₹", "Rs.");
}

function trimNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function pdfText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const words = pdfText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }

      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

async function embedLogo(pdf: PDFDocument, logo?: GstInvoiceLogo) {
  if (!logo) {
    return null;
  }

  try {
    if (logo.mimeType === "image/png") {
      return await pdf.embedPng(logo.bytes);
    }

    if (logo.mimeType === "image/jpeg" || logo.mimeType === "image/jpg") {
      return await pdf.embedJpg(logo.bytes);
    }
  } catch {
    return null;
  }

  return null;
}
