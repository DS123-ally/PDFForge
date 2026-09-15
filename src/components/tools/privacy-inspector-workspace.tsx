"use client";

import { useCallback, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { ProcessingCard } from "@/components/tools/processing-card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { createDownload } from "@/lib/files/create-download";
import {
  auditPdfPrivacy,
  type PrivacyAuditReport,
} from "@/lib/pdf/privacy-audit";
import { defaultPrivacySanitizeOptions } from "@/lib/pdf/privacy-sanitize";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";

export function PrivacyInspectorWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [report, setReport] = useState<PrivacyAuditReport | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [options, setOptions] = useState(defaultPrivacySanitizeOptions);
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const selectedFile = files[0];
  const isBusy = scanning || state.status === "processing";
  const canScan = Boolean(selectedFile && !isBusy);
  const canSanitize = Boolean(selectedFile && report && !isBusy);

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      setReport(null);
      setScanError(null);
      reset();
    },
    [reset],
  );

  async function scanPdf() {
    if (!selectedFile) {
      return;
    }

    setScanning(true);
    setScanError(null);
    setReport(null);
    reset();

    try {
      const bytes = await selectedFile.file.arrayBuffer();
      setReport(await auditPdfPrivacy(bytes));
    } catch {
      setScanError("PDFForge could not audit this PDF locally.");
    } finally {
      setScanning(false);
    }
  }

  async function sanitizePdf() {
    if (!selectedFile) {
      return;
    }

    await start([selectedFile], "sanitize-pdf", { sanitizePdf: options });
  }

  function processAnother() {
    setFiles([]);
    setReport(null);
    setScanError(null);
    setClearSignal((value) => value + 1);
    setOptions(defaultPrivacySanitizeOptions);
    reset();
  }

  if (state.status === "success" && state.result?.outputBytes) {
    return (
      <DownloadResultCard
        description="Sanitized copy written on this device. Re-scan it if you need another pass."
        onDownload={() =>
          createDownload(
            new Blob([state.result!.outputBytes!], { type: "application/pdf" }),
            { filename: state.result?.filename ?? "sanitized.pdf" },
          )
        }
        onProcessAnother={processAnother}
        title="Your sanitized PDF is ready"
      />
    );
  }

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      <FileUploader
        clearSignal={clearSignal}
        onFilesChange={handleFilesChange}
      />

      {selectedFile ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Privacy inspection</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Scan is read-only. Sanitize writes a new file using the checklist
            below. This reduces leak surface; it does not prove the file is
            empty of every hidden object.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button disabled={!canScan} onClick={scanPdf} type="button">
              Scan PDF
            </Button>
            <Button
              disabled={!canSanitize}
              onClick={sanitizePdf}
              type="button"
              variant="secondary"
            >
              Sanitize PDF
            </Button>
          </div>
        </section>
      ) : null}

      {scanning ? (
        <ProcessingCard
          state={{
            message: "Reading the PDF locally",
            progress: 35,
            status: "processing",
          }}
        />
      ) : null}

      {state.status === "processing" ? (
        <ProcessingCard onCancel={cancel} state={state} />
      ) : null}

      {scanError ? (
        <ErrorState description={scanError} title="Scan failed" />
      ) : null}

      {state.status === "error" && state.error ? (
        <ErrorState description={state.error.message} title="Sanitize failed" />
      ) : null}

      {report ? <AuditReport report={report} /> : null}

      {report ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Sanitize checklist</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Uncheck anything you need to keep. Flatten is optional and burns
            remaining field appearances into the page.
          </p>
          <ul className="mt-4 space-y-3">
            <ChecklistItem
              checked={options.stripMetadata}
              label="Strip standard and XMP metadata"
              onChange={(stripMetadata) =>
                setOptions((current) => ({ ...current, stripMetadata }))
              }
            />
            <ChecklistItem
              checked={options.dropAttachments}
              label="Drop embedded files and attachments"
              onChange={(dropAttachments) =>
                setOptions((current) => ({ ...current, dropAttachments }))
              }
            />
            <ChecklistItem
              checked={options.dropJavascript}
              label="Remove detected JavaScript actions"
              onChange={(dropJavascript) =>
                setOptions((current) => ({ ...current, dropJavascript }))
              }
            />
            <ChecklistItem
              checked={options.stripFormValues}
              label="Clear form field values"
              onChange={(stripFormValues) =>
                setOptions((current) => ({ ...current, stripFormValues }))
              }
            />
            <ChecklistItem
              checked={options.flattenForms}
              label="Flatten form fields into page content"
              onChange={(flattenForms) =>
                setOptions((current) => ({ ...current, flattenForms }))
              }
            />
            <ChecklistItem
              checked={options.stripImageExif}
              label="Strip JPEG EXIF where the bytes can be rewritten"
              onChange={(stripImageExif) =>
                setOptions((current) => ({ ...current, stripImageExif }))
              }
            />
          </ul>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            Saving always writes a new PDF, which drops a simple incremental
            update trailer. Hidden text on the page is not removed unless you
            use Redact PDF.
          </p>
        </section>
      ) : null}

      {selectedFile ? <PdfViewer file={selectedFile.file} /> : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canScan}
        label={report ? "Sanitize PDF" : "Scan PDF"}
        onClick={report ? sanitizePdf : scanPdf}
      />
    </div>
  );
}

function AuditReport({ report }: { report: PrivacyAuditReport }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Scan report</h2>
      <p className="mt-2 text-sm text-zinc-600">
        {report.pageCount} page{report.pageCount === 1 ? "" : "s"} inspected on
        this device.
      </p>
      {report.findings.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          No extra leak sources were detected with this scanner. That is not a
          proof of emptiness.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {report.findings.map((finding) => (
            <li
              className="rounded-xl border border-zinc-200 p-4"
              key={finding.title}
            >
              <p className="text-xs font-bold tracking-wide text-red-600 uppercase">
                {finding.severity === "warning" ? "Review" : "Noted"}
              </p>
              <h3 className="mt-1 font-bold text-zinc-950">{finding.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {finding.detail}
              </p>
              {finding.samples.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
                  {finding.samples.map((sample) => (
                    <li key={sample}>{sample}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChecklistItem({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <li>
      <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
        <input
          checked={checked}
          className="size-4 accent-red-600"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        {label}
      </label>
    </li>
  );
}
