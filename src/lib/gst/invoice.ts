import { stateName } from "@/lib/gst/states";

export type InvoiceKind = "tax-invoice" | "bill-of-supply";
export type SupplyMode = "intra" | "inter" | "unknown" | "bill";

export type GstParty = {
  address1: string;
  address2: string;
  city: string;
  email: string;
  gstin: string;
  name: string;
  phone: string;
  pincode: string;
  stateCode: string;
};

export type GstSeller = GstParty & {
  legalName: string;
  pan: string;
  tradeName: string;
};

export type GstLineItem = {
  description: string;
  gstRate: number;
  hsn: string;
  id: string;
  quantity: number;
  rate: number;
  unit: string;
};

export type GstInvoice = {
  buyer: GstParty;
  invoice: {
    date: string;
    dueDate: string;
    kind: InvoiceKind;
    number: string;
    placeOfSupply: string;
    reverseCharge: boolean;
    signatory: string;
  };
  items: GstLineItem[];
  other: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    notes: string;
    terms: string;
    upi: string;
  };
  seller: GstSeller;
};

export type LineTotals = {
  cgst: number;
  igst: number;
  sgst: number;
  tax: number;
  taxable: number;
  total: number;
};

export type InvoiceTotals = LineTotals & {
  lines: Array<GstLineItem & LineTotals>;
  mode: SupplyMode;
};

export type ComplianceItem = {
  done: boolean;
  id: string;
  label: string;
};

const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const codePoints = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

let lineSequence = 0;

export const gstRateOptions = [0, 0.25, 3, 5, 12, 18, 28, 40];

export function createLineItem(partial: Partial<GstLineItem> = {}): GstLineItem {
  lineSequence += 1;

  return {
    description: "",
    gstRate: 18,
    hsn: "",
    quantity: 1,
    rate: 0,
    unit: "NOS",
    ...partial,
    id: partial.id || `line-${lineSequence}`,
  };
}

export function createEmptyInvoice(today = ""): GstInvoice {
  return {
    buyer: emptyParty(),
    invoice: {
      date: today,
      dueDate: "",
      kind: "tax-invoice",
      number: "",
      placeOfSupply: "",
      reverseCharge: false,
      signatory: "",
    },
    items: [createLineItem()],
    other: {
      accountName: "",
      accountNumber: "",
      bankName: "",
      ifsc: "",
      notes: "",
      terms:
        "Goods once sold will not be taken back. Subject to local jurisdiction.",
      upi: "",
    },
    seller: {
      ...emptyParty(),
      legalName: "",
      pan: "",
      tradeName: "",
    },
  };
}

export function normalizeGstin(value: string) {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
}

export function gstinCheckDigit(body: string) {
  let factor = 2;
  let sum = 0;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    const code = codePoints.indexOf(body[index] ?? "");

    if (code < 0) {
      return "";
    }

    let digit = factor * code;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / 36) + (digit % 36);
    sum += digit;
  }

  return codePoints[(36 - (sum % 36)) % 36] ?? "";
}

export function isValidGstin(value: string) {
  const gstin = normalizeGstin(value);

  if (!gstinPattern.test(gstin)) {
    return false;
  }

  return gstinCheckDigit(gstin.slice(0, 14)) === gstin[14];
}

export function panFromGstin(value: string) {
  const gstin = normalizeGstin(value);

  if (gstin.length < 12) {
    return "";
  }

  const pan = gstin.slice(2, 12);

  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) ? pan : "";
}

export function stateCodeFromGstin(value: string) {
  const code = normalizeGstin(value).slice(0, 2);

  return stateName(code) ? code : "";
}

export function supplyMode(invoice: GstInvoice): SupplyMode {
  if (invoice.invoice.kind === "bill-of-supply") {
    return "bill";
  }

  const sellerState = invoice.seller.stateCode;
  const place = invoice.invoice.placeOfSupply;

  if (!stateName(sellerState) || !stateName(place)) {
    return "unknown";
  }

  return sellerState === place ? "intra" : "inter";
}

export function calculateInvoice(invoice: GstInvoice): InvoiceTotals {
  const mode = supplyMode(invoice);
  const lines = invoice.items.map((item) => ({
    ...item,
    ...lineTotals(item, mode),
  }));
  const totals = lines.reduce(
    (sum, line) => ({
      cgst: sum.cgst + line.cgst,
      igst: sum.igst + line.igst,
      sgst: sum.sgst + line.sgst,
      tax: sum.tax + line.tax,
      taxable: sum.taxable + line.taxable,
      total: sum.total + line.total,
    }),
    { cgst: 0, igst: 0, sgst: 0, tax: 0, taxable: 0, total: 0 },
  );

  return { ...roundTotals(totals), lines, mode };
}

export function formatInr(amount: number) {
  const negative = amount < 0;
  const [rupees, paise] = Math.abs(roundMoney(amount)).toFixed(2).split(".");
  const grouped =
    (rupees ?? "0").length <= 3
      ? (rupees ?? "0")
      : `${(rupees ?? "0").slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${(rupees ?? "0").slice(-3)}`;

  return `${negative ? "-" : ""}₹${grouped}.${paise}`;
}

export function formatInvoiceDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (!match) {
    return iso;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function amountInWords(amount: number) {
  const rounded = roundMoney(amount);
  const rupees = Math.max(0, Math.floor(rounded + 1e-6));
  const paise = Math.max(0, Math.round(rounded * 100) - rupees * 100);
  const rupeeWords =
    rupees >= 1_000_000_000_000
      ? formatInr(rupees).replace(/[^\d.,]/g, "")
      : indianIntegerWords(rupees);
  const paiseWords = paise ? ` and ${indianIntegerWords(paise)} Paise` : "";

  return `Indian Rupees ${rupeeWords}${paiseWords} Only`;
}

export function formatAddress(party: {
  address1: string;
  address2: string;
  city: string;
  pincode: string;
  stateCode: string;
}) {
  const cityLine = [party.city.trim(), stateName(party.stateCode), party.pincode.trim()]
    .filter(Boolean)
    .join(", ");

  return [party.address1, party.address2, cityLine]
    .map((line) => line.trim())
    .filter(Boolean);
}

export function complianceChecklist(invoice: GstInvoice): ComplianceItem[] {
  const described = invoice.items.filter((item) => item.description.trim());

  return [
    { done: true, id: "type", label: "Invoice type" },
    {
      done: invoice.invoice.number.trim().length > 0,
      id: "number",
      label: "Invoice number",
    },
    {
      done: /^\d{4}-\d{2}-\d{2}$/.test(invoice.invoice.date),
      id: "date",
      label: "Invoice date",
    },
    {
      done: isValidGstin(invoice.seller.gstin),
      id: "gstin",
      label: "Supplier GSTIN",
    },
    {
      done: Boolean(stateName(invoice.seller.stateCode)),
      id: "state",
      label: "Supplier state",
    },
    {
      done: invoice.buyer.name.trim().length > 0,
      id: "buyer",
      label: "Buyer name",
    },
    {
      done: Boolean(stateName(invoice.invoice.placeOfSupply)),
      id: "pos",
      label: "Place of supply",
    },
    {
      done:
        described.length > 0 &&
        described.every((item) => /^[0-9A-Za-z]{4,8}$/.test(item.hsn.trim())),
      id: "hsn",
      label: "HSN/SAC on all items",
    },
  ];
}

export function downloadBlockers(invoice: GstInvoice) {
  const blockers: string[] = [];

  if (!invoice.seller.tradeName.trim() && !invoice.seller.legalName.trim()) {
    blockers.push("Add a trade name or legal name.");
  }

  if (!invoice.invoice.number.trim()) {
    blockers.push("Add an invoice number.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.invoice.date)) {
    blockers.push("Add an invoice date.");
  }

  if (!isValidGstin(invoice.seller.gstin)) {
    blockers.push("Enter a valid 15-character supplier GSTIN.");
  }

  if (!stateName(invoice.seller.stateCode)) {
    blockers.push("Select the supplier state.");
  }

  if (!invoice.buyer.name.trim()) {
    blockers.push("Add the buyer name.");
  }

  if (!stateName(invoice.invoice.placeOfSupply)) {
    blockers.push("Select the place of supply.");
  }

  if (invoice.buyer.gstin.trim() && !isValidGstin(invoice.buyer.gstin)) {
    blockers.push("Buyer GSTIN is optional. Leave it blank or enter a valid one.");
  }

  const priced = invoice.items.filter(
    (item) => item.description.trim() && item.quantity > 0,
  );

  if (priced.length === 0) {
    blockers.push("Add at least one item with a description and quantity.");
  }

  if (
    priced.some(
      (item) => item.hsn.trim() && !/^[0-9A-Za-z]{4,8}$/.test(item.hsn.trim()),
    )
  ) {
    blockers.push("HSN/SAC codes should be 4 to 8 letters or digits.");
  }

  return blockers;
}

export function gstInvoiceFilename(invoice: GstInvoice) {
  const safe = invoice.invoice.number
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safe || "invoice"}-gst-invoice.pdf`;
}

export function invoiceKindLabel(kind: InvoiceKind) {
  return kind === "bill-of-supply" ? "Bill of Supply" : "Tax Invoice";
}

export function supplyLabel(mode: SupplyMode) {
  if (mode === "bill") {
    return "Bill of supply · no tax";
  }

  if (mode === "intra") {
    return "Intra-state · CGST + SGST";
  }

  if (mode === "inter") {
    return "Inter-state · IGST";
  }

  return "Set both states to split CGST/SGST or IGST";
}

function lineTotals(item: GstLineItem, mode: SupplyMode): LineTotals {
  const quantity = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
  const rate = Number.isFinite(item.rate) ? Math.max(0, item.rate) : 0;
  const taxablePaise = Math.round(quantity * rate * 100);
  const gstRate =
    mode === "bill" || !Number.isFinite(item.gstRate)
      ? 0
      : Math.min(100, Math.max(0, item.gstRate));
  const taxPaise = Math.round((taxablePaise * gstRate) / 100);
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (mode === "intra") {
    cgstPaise = Math.floor(taxPaise / 2);
    sgstPaise = taxPaise - cgstPaise;
  } else if (mode === "inter" || mode === "unknown") {
    igstPaise = taxPaise;
  }

  return {
    cgst: cgstPaise / 100,
    igst: igstPaise / 100,
    sgst: sgstPaise / 100,
    tax: taxPaise / 100,
    taxable: taxablePaise / 100,
    total: (taxablePaise + taxPaise) / 100,
  };
}

function roundTotals(values: LineTotals): LineTotals {
  return {
    cgst: roundMoney(values.cgst),
    igst: roundMoney(values.igst),
    sgst: roundMoney(values.sgst),
    tax: roundMoney(values.tax),
    taxable: roundMoney(values.taxable),
    total: roundMoney(values.total),
  };
}

function roundMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

function indianIntegerWords(value: number): string {
  const amount = Math.floor(value);

  if (amount === 0) {
    return "Zero";
  }

  const parts: string[] = [];
  const crore = Math.floor(amount / 10_000_000);

  if (crore) {
    parts.push(`${indianIntegerWords(crore)} Crore`);
  }

  const lakh = Math.floor((amount % 10_000_000) / 100_000);

  if (lakh) {
    parts.push(`${belowThousand(lakh)} Lakh`);
  }

  const thousand = Math.floor((amount % 100_000) / 1000);

  if (thousand) {
    parts.push(`${belowThousand(thousand)} Thousand`);
  }

  const rest = amount % 1000;

  if (rest) {
    parts.push(belowThousand(rest));
  }

  return parts.join(" ");
}

function belowThousand(value: number) {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];

  if (hundreds) {
    parts.push(`${ones[hundreds]} Hundred`);
  }

  if (rest) {
    parts.push(rest < 20 ? ones[rest]! : twoDigits(rest));
  }

  return parts.join(" ");
}

function twoDigits(value: number) {
  const ten = Math.floor(value / 10);
  const one = value % 10;

  return one ? `${tens[ten]} ${ones[one]}` : tens[ten]!;
}

function emptyParty(): GstParty {
  return {
    address1: "",
    address2: "",
    city: "",
    email: "",
    gstin: "",
    name: "",
    phone: "",
    pincode: "",
    stateCode: "",
  };
}
