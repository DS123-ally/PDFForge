"use client";

import { CheckCircle2, Circle, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { Button } from "@/components/ui/button";
import { createDownload } from "@/lib/files/create-download";
import {
  amountInWords,
  calculateInvoice,
  complianceChecklist,
  createEmptyInvoice,
  createLineItem,
  downloadBlockers,
  formatAddress,
  formatInr,
  formatInvoiceDate,
  gstInvoiceFilename,
  gstRateOptions,
  invoiceKindLabel,
  normalizeGstin,
  panFromGstin,
  stateCodeFromGstin,
  supplyLabel,
  type GstInvoice,
  type GstLineItem,
} from "@/lib/gst/invoice";
import { buildGstInvoicePdf, type GstInvoiceLogo } from "@/lib/gst/pdf";
import { gstStates, stateName } from "@/lib/gst/states";
import {
  clearGstTemplate,
  getGstTemplateRaw,
  getGstTemplateServerRaw,
  isInvoiceKind,
  parseGstTemplate,
  saveGstTemplate,
  subscribeGstTemplate,
} from "@/lib/gst/template";
import { cn } from "@/lib/utils";

type InvoiceTab = "seller" | "buyer" | "invoice" | "items" | "other";

const tabs: Array<{ id: InvoiceTab; label: string }> = [
  { id: "seller", label: "Seller" },
  { id: "buyer", label: "Buyer" },
  { id: "invoice", label: "Invoice" },
  { id: "items", label: "Items" },
  { id: "other", label: "Other" },
];

const units = ["NOS", "PCS", "KGS", "MTR", "LTR", "HRS", "BOX"];

const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100";

export function GstInvoiceWorkspace() {
  const templateRaw = useSyncExternalStore(
    subscribeGstTemplate,
    getGstTemplateRaw,
    getGstTemplateServerRaw,
  );
  const [invoice, setInvoice] = useState<GstInvoice>(() =>
    createEmptyInvoice(""),
  );
  const [tab, setTab] = useState<InvoiceTab>("seller");
  const [logo, setLogo] = useState<(GstInvoiceLogo & { url: string }) | null>(
    null,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const savedTemplate = useMemo(
    () => parseGstTemplate(templateRaw),
    [templateRaw],
  );
  const totals = useMemo(() => calculateInvoice(invoice), [invoice]);
  const checks = useMemo(() => complianceChecklist(invoice), [invoice]);
  const doneCount = checks.filter((item) => item.done).length;
  const gstinState = stateCodeFromGstin(invoice.seller.gstin);
  const stateMismatch = Boolean(
    gstinState &&
    invoice.seller.stateCode &&
    gstinState !== invoice.seller.stateCode,
  );

  useEffect(() => {
    return () => {
      if (logo?.url) {
        URL.revokeObjectURL(logo.url);
      }
    };
  }, [logo]);

  function patchSeller(patch: Partial<GstInvoice["seller"]>) {
    setInvoice((current) => ({
      ...current,
      seller: { ...current.seller, ...patch },
    }));
  }

  function updateSellerGstin(value: string) {
    const gstin = normalizeGstin(value);
    const pan = panFromGstin(gstin);
    const stateCode = stateCodeFromGstin(gstin);

    setInvoice((current) => ({
      ...current,
      seller: {
        ...current.seller,
        gstin,
        pan: pan || current.seller.pan,
        stateCode: current.seller.stateCode || stateCode,
      },
    }));
  }

  function updateItem(id: string, patch: Partial<GstLineItem>) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function saveTemplate() {
    saveGstTemplate(window.localStorage, invoice);
    setNotice("Template saved on this device. The PDF itself is not stored.");
    setError("");
  }

  function loadTemplate() {
    if (!savedTemplate) {
      return;
    }

    setInvoice(savedTemplate);
    setNotice("Loaded the template saved on this device.");
    setError("");
  }

  function forgetTemplate() {
    clearGstTemplate(window.localStorage);
    setNotice("Saved template removed from this device.");
  }

  async function downloadPdf() {
    const blockers = downloadBlockers(invoice);

    if (blockers.length > 0) {
      setError(blockers[0] ?? "Complete the invoice before downloading.");
      setShowPreview(true);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const bytes = await buildGstInvoicePdf(
        invoice,
        logo ? { bytes: logo.bytes, mimeType: logo.mimeType } : undefined,
      );

      createDownload(bytes, { filename: gstInvoiceFilename(invoice) });
      setNotice("PDF downloaded. It was built in this browser.");
    } catch {
      setError("Could not build the PDF in this browser.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-center text-sm text-zinc-600">
        Tax Invoice · Bill of Supply · CGST/SGST/IGST · HSN/SAC · 100% local, no
        upload
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={saveTemplate} type="button" variant="secondary">
          Save Template
        </Button>
        {savedTemplate ? (
          <Button onClick={loadTemplate} type="button" variant="secondary">
            Load Template
          </Button>
        ) : null}
        <Button
          onClick={() => {
            setShowPreview(true);
            setError("");
          }}
          type="button"
        >
          Preview
        </Button>
        <Button
          disabled={busy}
          onClick={() => void downloadPdf()}
          type="button"
          variant="secondary"
        >
          {busy ? "Building PDF…" : "Download PDF"}
        </Button>
      </div>
      {notice ? (
        <p className="mt-4 text-center text-sm text-zinc-600" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 text-center text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div>
          <div
            aria-label="Invoice sections"
            className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 sm:grid-cols-5"
            role="tablist"
          >
            {tabs.map((item) => {
              const selected = tab === item.id;

              return (
                <button
                  aria-selected={selected}
                  className={cn(
                    "min-h-11 rounded-xl px-3 text-sm font-bold",
                    selected
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:text-zinc-950",
                  )}
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  role="tab"
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            {tab === "seller" ? (
              <SellerFields
                invoice={invoice}
                logoUrl={logo?.url ?? ""}
                onChange={patchSeller}
                onGstin={updateSellerGstin}
                onLogo={(next) => {
                  setLogo((current) => {
                    if (current?.url) {
                      URL.revokeObjectURL(current.url);
                    }

                    return next;
                  });
                }}
                stateMismatch={stateMismatch}
              />
            ) : null}
            {tab === "buyer" ? (
              <BuyerFields
                invoice={invoice}
                onChange={(patch) =>
                  setInvoice((current) => ({
                    ...current,
                    buyer: { ...current.buyer, ...patch },
                  }))
                }
              />
            ) : null}
            {tab === "invoice" ? (
              <InvoiceFields
                invoice={invoice}
                onChange={(next) => setInvoice(next)}
              />
            ) : null}
            {tab === "items" ? (
              <ItemFields
                invoice={invoice}
                onAdd={() =>
                  setInvoice((current) => ({
                    ...current,
                    items: [...current.items, createLineItem()],
                  }))
                }
                onChange={updateItem}
                onRemove={(id) =>
                  setInvoice((current) => ({
                    ...current,
                    items:
                      current.items.length === 1
                        ? current.items
                        : current.items.filter((item) => item.id !== id),
                  }))
                }
              />
            ) : null}
            {tab === "other" ? (
              <OtherFields
                invoice={invoice}
                onChange={(patch) =>
                  setInvoice((current) => ({
                    ...current,
                    other: { ...current.other, ...patch },
                  }))
                }
                onForget={forgetTemplate}
              />
            ) : null}
          </div>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">GST Compliance</h2>
              <span className="text-xs font-semibold text-zinc-500">
                {doneCount}/{checks.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {checks.map((item) => (
                <li className="flex items-center gap-2 text-sm" key={item.id}>
                  {item.done ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-emerald-600"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className="size-4 text-zinc-300"
                    />
                  )}
                  <span
                    className={item.done ? "text-zinc-800" : "text-zinc-500"}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-bold">Quick Summary</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {supplyLabel(totals.mode)}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <SummaryRow label="Subtotal" value={formatInr(totals.taxable)} />
              {totals.mode === "intra" ? (
                <>
                  <SummaryRow label="CGST" value={formatInr(totals.cgst)} />
                  <SummaryRow label="SGST" value={formatInr(totals.sgst)} />
                </>
              ) : null}
              {totals.mode === "inter" ? (
                <SummaryRow label="IGST" value={formatInr(totals.igst)} />
              ) : null}
              {totals.mode === "unknown" ? (
                <SummaryRow label="GST" value={formatInr(totals.tax)} />
              ) : (
                <SummaryRow label="Total tax" value={formatInr(totals.tax)} />
              )}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-2 font-bold">
                <dt>Grand total</dt>
                <dd data-testid="gst-grand-total">{formatInr(totals.total)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {showPreview ? (
        <InvoicePreview invoice={invoice} logoUrl={logo?.url ?? ""} />
      ) : null}

      <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
        Totals and the PDF are calculated in this browser. Saving a template
        stores the form on this device only. This formats an invoice; it does
        not file GST returns.
      </p>
      <div className="mt-5">
        <PrivacyNotice />
      </div>
    </div>
  );
}

function SellerFields({
  invoice,
  logoUrl,
  onChange,
  onGstin,
  onLogo,
  stateMismatch,
}: {
  invoice: GstInvoice;
  logoUrl: string;
  onChange: (patch: Partial<GstInvoice["seller"]>) => void;
  onGstin: (value: string) => void;
  onLogo: (logo: (GstInvoiceLogo & { url: string }) | null) => void;
  stateMismatch: boolean;
}) {
  const seller = invoice.seller;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-zinc-900 sm:col-span-2">
        Logo
        <span className="mt-2 flex min-h-24 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 text-zinc-500">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="max-h-20 max-w-24 object-contain"
              src={logoUrl}
            />
          ) : (
            <>
              <ImagePlus aria-hidden="true" className="size-5" />
              <span className="mt-1 text-xs font-medium">PNG or JPG</span>
            </>
          )}
          <input
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (!file) {
                return;
              }

              void file.arrayBuffer().then((buffer) => {
                onLogo({
                  bytes: new Uint8Array(buffer),
                  mimeType: file.type,
                  url: URL.createObjectURL(file),
                });
              });
            }}
            type="file"
          />
        </span>
      </label>
      <TextField
        className="sm:col-span-2"
        label="Trade / brand name"
        onChange={(tradeName) => onChange({ tradeName })}
        required
        testId="gst-trade-name"
        value={seller.tradeName}
      />
      <TextField
        className="sm:col-span-2"
        label="Legal name (as per GST registration)"
        onChange={(legalName) => onChange({ legalName })}
        value={seller.legalName}
      />
      <TextField
        hint={
          stateMismatch
            ? `GSTIN state is ${stateName(gstinStateCode(seller.gstin))}. Supplier state does not match.`
            : "15-character GSTIN. PAN is filled from characters 3–12."
        }
        label="GSTIN"
        onChange={onGstin}
        required
        value={seller.gstin}
      />
      <TextField
        hint="Auto-filled from GSTIN when the number is long enough."
        label="PAN"
        onChange={(pan) => onChange({ pan: pan.toUpperCase() })}
        value={seller.pan}
      />
      <TextField
        label="Address line 1"
        onChange={(address1) => onChange({ address1 })}
        required
        value={seller.address1}
      />
      <TextField
        label="Address line 2"
        onChange={(address2) => onChange({ address2 })}
        value={seller.address2}
      />
      <TextField
        label="City"
        onChange={(city) => onChange({ city })}
        value={seller.city}
      />
      <TextField
        label="PIN code"
        onChange={(pincode) => onChange({ pincode })}
        value={seller.pincode}
      />
      <StateField
        id="gst-seller-state"
        label="Supplier state"
        onChange={(stateCode) => onChange({ stateCode })}
        required
        value={seller.stateCode}
      />
      <TextField
        label="Phone"
        onChange={(phone) => onChange({ phone })}
        value={seller.phone}
      />
      <TextField
        className="sm:col-span-2"
        label="Email"
        onChange={(email) => onChange({ email })}
        value={seller.email}
      />
    </div>
  );
}

function BuyerFields({
  invoice,
  onChange,
}: {
  invoice: GstInvoice;
  onChange: (patch: Partial<GstInvoice["buyer"]>) => void;
}) {
  const buyer = invoice.buyer;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        className="sm:col-span-2"
        label="Buyer name"
        onChange={(name) => onChange({ name })}
        required
        testId="gst-buyer-name"
        value={buyer.name}
      />
      <TextField
        className="sm:col-span-2"
        hint="Leave blank for an unregistered buyer."
        label="Buyer GSTIN"
        onChange={(gstin) => onChange({ gstin: normalizeGstin(gstin) })}
        value={buyer.gstin}
      />
      <TextField
        label="Address line 1"
        onChange={(address1) => onChange({ address1 })}
        value={buyer.address1}
      />
      <TextField
        label="Address line 2"
        onChange={(address2) => onChange({ address2 })}
        value={buyer.address2}
      />
      <TextField
        label="City"
        onChange={(city) => onChange({ city })}
        value={buyer.city}
      />
      <TextField
        label="PIN code"
        onChange={(pincode) => onChange({ pincode })}
        value={buyer.pincode}
      />
      <StateField
        id="gst-buyer-state"
        label="Buyer state"
        onChange={(stateCode) => onChange({ stateCode })}
        value={buyer.stateCode}
      />
      <TextField
        label="Phone"
        onChange={(phone) => onChange({ phone })}
        value={buyer.phone}
      />
      <TextField
        className="sm:col-span-2"
        label="Email"
        onChange={(email) => onChange({ email })}
        value={buyer.email}
      />
    </div>
  );
}

function InvoiceFields({
  invoice,
  onChange,
}: {
  invoice: GstInvoice;
  onChange: (invoice: GstInvoice) => void;
}) {
  const details = invoice.invoice;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label
        className="block text-sm font-semibold text-zinc-900"
        htmlFor="gst-kind"
      >
        Invoice type *
        <select
          className={inputClass}
          id="gst-kind"
          onChange={(event) => {
            if (!isInvoiceKind(event.target.value)) {
              return;
            }

            onChange({
              ...invoice,
              invoice: { ...details, kind: event.target.value },
            });
          }}
          value={details.kind}
        >
          <option value="tax-invoice">Tax Invoice</option>
          <option value="bill-of-supply">Bill of Supply</option>
        </select>
      </label>
      <TextField
        label="Invoice number"
        onChange={(number) =>
          onChange({ ...invoice, invoice: { ...details, number } })
        }
        required
        testId="gst-invoice-number"
        value={details.number}
      />
      <TextField
        label="Invoice date"
        onChange={(date) =>
          onChange({ ...invoice, invoice: { ...details, date } })
        }
        required
        type="date"
        value={details.date}
      />
      <TextField
        label="Due date"
        onChange={(dueDate) =>
          onChange({ ...invoice, invoice: { ...details, dueDate } })
        }
        type="date"
        value={details.dueDate}
      />
      <StateField
        id="gst-place-of-supply"
        label="Place of supply"
        onChange={(placeOfSupply) =>
          onChange({ ...invoice, invoice: { ...details, placeOfSupply } })
        }
        required
        value={details.placeOfSupply}
      />
      <TextField
        label="Authorised signatory"
        onChange={(signatory) =>
          onChange({ ...invoice, invoice: { ...details, signatory } })
        }
        value={details.signatory}
      />
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold sm:col-span-2">
        <input
          checked={details.reverseCharge}
          className="size-4 accent-red-600"
          onChange={(event) =>
            onChange({
              ...invoice,
              invoice: { ...details, reverseCharge: event.target.checked },
            })
          }
          type="checkbox"
        />
        Reverse charge
      </label>
    </div>
  );
}

function ItemFields({
  invoice,
  onAdd,
  onChange,
  onRemove,
}: {
  invoice: GstInvoice;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<GstLineItem>) => void;
  onRemove: (id: string) => void;
}) {
  const bill = invoice.invoice.kind === "bill-of-supply";
  const totals = calculateInvoice(invoice);

  return (
    <div>
      <div className="space-y-4">
        {invoice.items.map((item, index) => {
          const line = totals.lines[index];

          return (
            <div
              className="grid gap-3 rounded-xl border border-zinc-200 p-3 sm:grid-cols-6"
              key={item.id}
            >
              <TextField
                className="sm:col-span-3"
                label="Description"
                onChange={(description) => onChange(item.id, { description })}
                testId={index === 0 ? "gst-item-description" : undefined}
                value={item.description}
              />
              <TextField
                className="sm:col-span-2"
                label="HSN/SAC"
                onChange={(hsn) =>
                  onChange(item.id, { hsn: hsn.toUpperCase() })
                }
                value={item.hsn}
              />
              <label className="block text-sm font-semibold text-zinc-900">
                Unit
                <select
                  className={inputClass}
                  onChange={(event) =>
                    onChange(item.id, { unit: event.target.value })
                  }
                  value={item.unit}
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Qty"
                onChange={(value) =>
                  onChange(item.id, { quantity: numberValue(value) })
                }
                testId={index === 0 ? "gst-item-qty" : undefined}
                type="number"
                value={String(item.quantity)}
              />
              <TextField
                label="Rate"
                onChange={(value) =>
                  onChange(item.id, { rate: numberValue(value) })
                }
                testId={index === 0 ? "gst-item-rate" : undefined}
                type="number"
                value={String(item.rate)}
              />
              <label className="block text-sm font-semibold text-zinc-900 sm:col-span-2">
                GST %
                <select
                  className={inputClass}
                  disabled={bill}
                  onChange={(event) =>
                    onChange(item.id, { gstRate: Number(event.target.value) })
                  }
                  value={String(item.gstRate)}
                >
                  {rateChoices(item.gstRate).map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-between gap-3 sm:col-span-2">
                <p className="text-sm">
                  <span className="block text-xs font-semibold text-zinc-500">
                    Line total
                  </span>
                  <span className="font-bold">
                    {formatInr(line?.total ?? 0)}
                  </span>
                </p>
                <button
                  aria-label={`Remove item ${index + 1}`}
                  className="inline-flex size-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-red-700 disabled:opacity-40"
                  disabled={invoice.items.length === 1}
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Button
        className="mt-4"
        onClick={onAdd}
        type="button"
        variant="secondary"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add item
      </Button>
    </div>
  );
}

function OtherFields({
  invoice,
  onChange,
  onForget,
}: {
  invoice: GstInvoice;
  onChange: (patch: Partial<GstInvoice["other"]>) => void;
  onForget: () => void;
}) {
  const other = invoice.other;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Bank name"
        onChange={(bankName) => onChange({ bankName })}
        value={other.bankName}
      />
      <TextField
        label="Account name"
        onChange={(accountName) => onChange({ accountName })}
        value={other.accountName}
      />
      <TextField
        label="Account number"
        onChange={(accountNumber) => onChange({ accountNumber })}
        value={other.accountNumber}
      />
      <TextField
        label="IFSC"
        onChange={(ifsc) => onChange({ ifsc: ifsc.toUpperCase() })}
        value={other.ifsc}
      />
      <TextField
        className="sm:col-span-2"
        label="UPI ID"
        onChange={(upi) => onChange({ upi })}
        value={other.upi}
      />
      <TextArea
        label="Notes"
        onChange={(notes) => onChange({ notes })}
        value={other.notes}
      />
      <TextArea
        label="Terms"
        onChange={(terms) => onChange({ terms })}
        value={other.terms}
      />
      <div className="sm:col-span-2">
        <Button onClick={onForget} type="button" variant="ghost">
          Remove saved template
        </Button>
      </div>
    </div>
  );
}

function InvoicePreview({
  invoice,
  logoUrl,
}: {
  invoice: GstInvoice;
  logoUrl: string;
}) {
  const totals = calculateInvoice(invoice);
  const sellerLines = [
    invoice.seller.legalName,
    invoice.seller.gstin ? `GSTIN ${invoice.seller.gstin}` : "",
    invoice.seller.pan ? `PAN ${invoice.seller.pan}` : "",
    ...formatAddress(invoice.seller),
  ].filter(Boolean);

  return (
    <section
      aria-label="Invoice preview"
      className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:p-5"
      id="gst-preview"
    >
      <article className="min-w-[40rem] bg-white p-6 text-sm text-zinc-800 shadow-sm">
        <div className="flex items-start justify-between gap-6 border-b border-zinc-200 pb-4">
          <div className="flex gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="size-12 object-contain" src={logoUrl} />
            ) : null}
            <div>
              <p className="text-xs font-bold tracking-wide text-red-700 uppercase">
                {invoiceKindLabel(invoice.invoice.kind)}
              </p>
              <h2 className="text-xl font-black text-zinc-950">
                {invoice.seller.tradeName ||
                  invoice.seller.legalName ||
                  "Supplier"}
              </h2>
              {sellerLines.map((line) => (
                <p className="text-zinc-600" key={line}>
                  {line}
                </p>
              ))}
            </div>
          </div>
          <dl className="text-right">
            <div>
              <dt className="text-xs text-zinc-500">Invoice number</dt>
              <dd className="font-bold">{invoice.invoice.number || "—"}</dd>
            </div>
            <div className="mt-2">
              <dt className="text-xs text-zinc-500">Date</dt>
              <dd>{formatInvoiceDate(invoice.invoice.date) || "—"}</dd>
            </div>
            <div className="mt-2">
              <dt className="text-xs text-zinc-500">Place of supply</dt>
              <dd>{stateName(invoice.invoice.placeOfSupply) || "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold tracking-wide text-zinc-500 uppercase">
            Bill to
          </p>
          <p className="font-bold">{invoice.buyer.name || "Buyer"}</p>
          <p>
            {invoice.buyer.gstin
              ? `GSTIN ${invoice.buyer.gstin}`
              : "Unregistered"}
          </p>
          {formatAddress(invoice.buyer).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-300 text-xs uppercase">
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">HSN/SAC</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Rate</th>
              <th className="py-2 pr-2 text-right">Taxable</th>
              {totals.mode === "intra" ? (
                <>
                  <th className="py-2 pr-2 text-right">CGST</th>
                  <th className="py-2 pr-2 text-right">SGST</th>
                </>
              ) : null}
              {totals.mode === "inter" || totals.mode === "unknown" ? (
                <th className="py-2 pr-2 text-right">
                  {totals.mode === "inter" ? "IGST" : "GST"}
                </th>
              ) : null}
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((line) => (
              <tr className="border-b border-zinc-100" key={line.id}>
                <td className="py-2 pr-2">{line.description || "—"}</td>
                <td className="py-2 pr-2">{line.hsn || "—"}</td>
                <td className="py-2 pr-2 text-right">
                  {line.quantity} {line.unit}
                </td>
                <td className="py-2 pr-2 text-right">{formatInr(line.rate)}</td>
                <td className="py-2 pr-2 text-right">
                  {formatInr(line.taxable)}
                </td>
                {totals.mode === "intra" ? (
                  <>
                    <td className="py-2 pr-2 text-right">
                      {formatInr(line.cgst)}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {formatInr(line.sgst)}
                    </td>
                  </>
                ) : null}
                {totals.mode === "inter" || totals.mode === "unknown" ? (
                  <td className="py-2 pr-2 text-right">
                    {formatInr(line.tax)}
                  </td>
                ) : null}
                <td className="py-2 text-right font-semibold">
                  {formatInr(line.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm font-semibold">
          {amountInWords(totals.total)}
        </p>
        <p className="mt-4 text-right text-base font-black">
          Grand total {formatInr(totals.total)}
        </p>
      </article>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-zinc-600">
      <dt>{label}</dt>
      <dd className="font-semibold text-zinc-950">{value}</dd>
    </div>
  );
}

function TextField({
  className,
  hint,
  label,
  onChange,
  required,
  testId,
  type = "text",
  value,
}: {
  className?: string;
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  testId?: string;
  type?: string;
  value: string;
}) {
  return (
    <label
      className={cn("block text-sm font-semibold text-zinc-900", className)}
    >
      {label}
      {required ? " *" : ""}
      <input
        className={inputClass}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
      {hint ? (
        <span className="mt-1 block text-xs font-normal text-zinc-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-zinc-900">
      {label}
      <textarea
        className={cn(inputClass, "min-h-24 py-2")}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function StateField({
  id,
  label,
  onChange,
  required,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-zinc-900" htmlFor={id}>
      {label}
      {required ? " *" : ""}
      <select
        className={inputClass}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Select state</option>
        {gstStates.map((state) => (
          <option key={state.code} value={state.code}>
            {state.code} — {state.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function rateChoices(current: number) {
  const rates = new Set<number>(gstRateOptions);

  if (Number.isFinite(current)) {
    rates.add(current);
  }

  return [...rates].sort((left, right) => left - right);
}

function numberValue(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function gstinStateCode(gstin: string) {
  return stateCodeFromGstin(gstin);
}
