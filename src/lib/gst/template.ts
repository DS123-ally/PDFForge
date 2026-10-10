import {
  createEmptyInvoice,
  createLineItem,
  normalizeGstin,
  type GstInvoice,
  type GstLineItem,
  type InvoiceKind,
} from "@/lib/gst/invoice";

export const gstTemplateStorageKey = "forge.gst-invoice.template.v1";

const templateListeners = new Set<() => void>();

export function subscribeGstTemplate(onStoreChange: () => void) {
  templateListeners.add(onStoreChange);

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStoreChange);
  }

  return () => {
    templateListeners.delete(onStoreChange);

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStoreChange);
    }
  };
}

export function getGstTemplateRaw() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(gstTemplateStorageKey);
}

export function getGstTemplateServerRaw() {
  return null;
}

export function serializeGstTemplate(invoice: GstInvoice) {
  return JSON.stringify({ invoice, version: 1 });
}

export function parseGstTemplate(raw: string | null): GstInvoice | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { invoice?: unknown; version?: unknown };

    if (parsed.version !== 1) {
      return null;
    }

    return sanitizeInvoice(parsed.invoice);
  } catch {
    return null;
  }
}

export function readGstTemplate(storage: Storage | null) {
  if (!storage) {
    return null;
  }

  return parseGstTemplate(storage.getItem(gstTemplateStorageKey));
}

export function saveGstTemplate(storage: Storage, invoice: GstInvoice) {
  storage.setItem(gstTemplateStorageKey, serializeGstTemplate(invoice));
  notifyGstTemplate();
}

export function clearGstTemplate(storage: Storage) {
  storage.removeItem(gstTemplateStorageKey);
  notifyGstTemplate();
}

function notifyGstTemplate() {
  for (const listener of templateListeners) {
    listener();
  }
}

function sanitizeInvoice(value: unknown): GstInvoice | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Partial<GstInvoice>;
  const empty = createEmptyInvoice();
  const seller = asRecord(source.seller);
  const buyer = asRecord(source.buyer);
  const invoice = asRecord(source.invoice);
  const other = asRecord(source.other);
  const items = Array.isArray(source.items)
    ? source.items.slice(0, 50).map((item) => sanitizeItem(item))
    : [];

  return {
    buyer: {
      address1: text(buyer.address1, 160),
      address2: text(buyer.address2, 160),
      city: text(buyer.city, 80),
      email: text(buyer.email, 120),
      gstin: normalizeGstin(text(buyer.gstin, 20)),
      name: text(buyer.name, 160),
      phone: text(buyer.phone, 30),
      pincode: text(buyer.pincode, 10),
      stateCode: text(buyer.stateCode, 2),
    },
    invoice: {
      date: text(invoice.date, 10),
      dueDate: text(invoice.dueDate, 10),
      kind:
        invoice.kind === "bill-of-supply" ? "bill-of-supply" : "tax-invoice",
      number: text(invoice.number, 40),
      placeOfSupply: text(invoice.placeOfSupply, 2),
      reverseCharge: invoice.reverseCharge === true,
      signatory: text(invoice.signatory, 80),
    },
    items: items.length > 0 ? items : empty.items,
    other: {
      accountName: text(other.accountName, 120),
      accountNumber: text(other.accountNumber, 40),
      bankName: text(other.bankName, 120),
      ifsc: text(other.ifsc, 20).toUpperCase(),
      notes: text(other.notes, 500),
      terms: text(other.terms, 500) || empty.other.terms,
      upi: text(other.upi, 80),
    },
    seller: {
      address1: text(seller.address1, 160),
      address2: text(seller.address2, 160),
      city: text(seller.city, 80),
      email: text(seller.email, 120),
      gstin: normalizeGstin(text(seller.gstin, 20)),
      legalName: text(seller.legalName, 160),
      name: "",
      pan: text(seller.pan, 10).toUpperCase(),
      phone: text(seller.phone, 30),
      pincode: text(seller.pincode, 10),
      stateCode: text(seller.stateCode, 2),
      tradeName: text(seller.tradeName, 160),
    },
  };
}

function sanitizeItem(value: unknown): GstLineItem {
  const item = asRecord(value);

  return createLineItem({
    description: text(item.description, 180),
    gstRate: clampNumber(item.gstRate, 0, 100, 18),
    hsn: text(item.hsn, 8).toUpperCase(),
    id: text(item.id, 40) || undefined,
    quantity: clampNumber(item.quantity, 0, 1_000_000, 1),
    rate: clampNumber(item.rate, 0, 100_000_000, 0),
    unit: text(item.unit, 12) || "NOS",
  });
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const number = typeof value === "number" ? value : Number.NaN;

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

export function isInvoiceKind(value: string): value is InvoiceKind {
  return value === "tax-invoice" || value === "bill-of-supply";
}
