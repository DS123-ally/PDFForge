import { describe, expect, it } from "vitest";

import {
  amountInWords,
  calculateInvoice,
  createEmptyInvoice,
  createLineItem,
  gstinCheckDigit,
  isValidGstin,
  panFromGstin,
  stateCodeFromGstin,
} from "@/lib/gst/invoice";
import { buildGstInvoicePdf } from "@/lib/gst/pdf";
import { parseGstTemplate, serializeGstTemplate } from "@/lib/gst/template";

function sampleInvoice() {
  const invoice = createEmptyInvoice("2026-10-06");
  const body = "27AAPFU0939F1Z";
  const gstin = `${body}${gstinCheckDigit(body)}`;

  invoice.seller.tradeName = "Northwind Traders";
  invoice.seller.legalName = "Northwind Traders Private Limited";
  invoice.seller.gstin = gstin;
  invoice.seller.pan = panFromGstin(gstin);
  invoice.seller.stateCode = "27";
  invoice.seller.address1 = "12 Link Road";
  invoice.buyer.name = "Acme Stores";
  invoice.buyer.stateCode = "27";
  invoice.invoice.number = "INV-12";
  invoice.invoice.placeOfSupply = "27";
  invoice.items = [
    createLineItem({
      description: "Cotton shirts",
      gstRate: 18,
      hsn: "6109",
      id: "line-shirts",
      quantity: 2,
      rate: 100,
      unit: "PCS",
    }),
  ];

  return invoice;
}

describe("GST invoice calculations", () => {
  it("validates a GSTIN checksum and reads PAN plus state", () => {
    const body = "27AAPFU0939F1Z";
    const gstin = `${body}${gstinCheckDigit(body)}`;

    expect(gstin).toBe("27AAPFU0939F1ZV");
    expect(isValidGstin(gstin)).toBe(true);
    expect(isValidGstin(`${body}A`)).toBe(false);
    expect(panFromGstin(gstin)).toBe("AAPFU0939F");
    expect(stateCodeFromGstin(gstin)).toBe("27");
  });

  it("splits GST into CGST and SGST inside the same state", () => {
    const totals = calculateInvoice(sampleInvoice());

    expect(totals.mode).toBe("intra");
    expect(totals.taxable).toBe(200);
    expect(totals.cgst).toBe(18);
    expect(totals.sgst).toBe(18);
    expect(totals.igst).toBe(0);
    expect(totals.total).toBe(236);
    expect(amountInWords(totals.total)).toBe(
      "Indian Rupees Two Hundred Thirty Six Only",
    );
  });

  it("charges IGST when the place of supply is another state", () => {
    const invoice = sampleInvoice();
    invoice.invoice.placeOfSupply = "29";
    const totals = calculateInvoice(invoice);

    expect(totals.mode).toBe("inter");
    expect(totals.igst).toBe(36);
    expect(totals.cgst).toBe(0);
    expect(totals.total).toBe(236);
  });

  it("drops tax on a bill of supply", () => {
    const invoice = sampleInvoice();
    invoice.invoice.kind = "bill-of-supply";
    const totals = calculateInvoice(invoice);

    expect(totals.mode).toBe("bill");
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(200);
  });

  it("keeps CGST and SGST in whole paise", () => {
    const invoice = sampleInvoice();
    invoice.items = [
      createLineItem({
        description: "Sample",
        gstRate: 5,
        hsn: "9985",
        quantity: 1,
        rate: 10.01,
      }),
    ];
    const totals = calculateInvoice(invoice);

    expect(totals.taxable).toBe(10.01);
    expect(totals.tax).toBe(0.5);
    expect(totals.cgst + totals.sgst).toBeCloseTo(0.5, 2);
    expect(totals.total).toBe(10.51);
  });

  it("reads an Indian amount in crores and paise", () => {
    expect(amountInWords(12345678)).toBe(
      "Indian Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only",
    );
    expect(amountInWords(236.5)).toBe(
      "Indian Rupees Two Hundred Thirty Six and Fifty Paise Only",
    );
  });

  it("round-trips a saved template without keeping extra fields", () => {
    const invoice = sampleInvoice();
    const restored = parseGstTemplate(serializeGstTemplate(invoice));

    expect(restored?.seller.tradeName).toBe("Northwind Traders");
    expect(restored?.invoice.number).toBe("INV-12");
    expect(restored?.items[0]?.hsn).toBe("6109");
    expect(parseGstTemplate("{")).toBeNull();
    expect(parseGstTemplate(JSON.stringify({ version: 2 }))).toBeNull();
  });

  it("builds a PDF in memory", async () => {
    const bytes = await buildGstInvoicePdf(sampleInvoice());

    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
