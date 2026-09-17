"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";
import { percentRectToPdfRegion, redactPdf } from "@/lib/pdf/redact-pdf";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";
import {
  countByRiskKind,
  privacyRiskChips,
  privacyRiskLabels,
  scanPrivacyRisk,
  type PrivacyRiskMatch,
  type PrivacyRiskReport,
} from "@/lib/pdf/privacy-risk";
import {
  defaultPrivacySanitizeOptions,
  sanitizePdfBuffer,
} from "@/lib/pdf/privacy-sanitize";

type ListedMatch = PrivacyRiskMatch & { confirmed: boolean; id: string };

export function PrivacyRiskScannerWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [matches, setMatches] = useState<ListedMatch[]>([]);
  const [report, setReport] = useState<PrivacyRiskReport | null>(null);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: ArrayBuffer;
    filename: string;
    totalPages: number;
  } | null>(null);
  const selectedFile = files[0];
  const confirmed = matches.filter((match) => match.confirmed);
  const counts = report ? countByRiskKind(report) : null;
  const canExport =
    Boolean(selectedFile && document && report) &&
    status !== "processing" &&
    status !== "scanning";

  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setMatches([]);
    setReport(null);
    setPageNumber(1);
    setStatus("idle");
    setMessage("Ready");
    setOutput(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function loadDocument() {
      setDocument(null);

      if (!selectedFile) {
        return;
      }

      const pdfjs = await getPdfJs();
      const buffer = await selectedFile.file.arrayBuffer();
      loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        disableAutoFetch: true,
        disableStream: true,
        useWorkerFetch: false,
      });
      loadedDocument = await loadingTask.promise;

      if (cancelled) {
        await loadedDocument.cleanup();
        return;
      }

      setDocument(loadedDocument);
    }

    void loadDocument();

    return () => {
      cancelled = true;
      void loadedDocument?.cleanup();
      destroyLoadingTask(loadingTask);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile || !document) {
      return;
    }

    let cancelled = false;

    async function runScan() {
      if (!selectedFile || !document) {
        return;
      }

      const pdf = document;
      const file = selectedFile;
      setStatus("scanning");
      setMessage("Scanning the text layer and document structure locally");
      setOutput(null);

      try {
        const bytes = await file.file.arrayBuffer();
        const nextReport = await scanPrivacyRisk(bytes, pdf);

        if (cancelled) {
          return;
        }

        setReport(nextReport);
        setMatches(
          nextReport.matches.map((match, index) => ({
            ...match,
            confirmed: true,
            id: `risk-${index}-${match.kind}-${match.text}`,
          })),
        );
        setStatus("idle");
        setMessage(
          nextReport.matches.length === 0 && nextReport.notes.length === 0
            ? "No text-layer or structure hits. Scanned pages without selectable text may still hide data in images."
            : `Found ${nextReport.matches.length} page match${nextReport.matches.length === 1 ? "" : "es"} and ${nextReport.notes.length} structure note${nextReport.notes.length === 1 ? "" : "s"}. Uncheck anything you want to keep.`,
        );
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("PDFForge could not scan this PDF.");
        }
      }
    }

    void runScan();

    return () => {
      cancelled = true;
    };
  }, [document, selectedFile]);

  async function exportRedactedPdf() {
    if (!selectedFile || !document || !report) {
      return;
    }

    setStatus("processing");
    setMessage("Writing a redacted local copy");
    setOutput(null);

    try {
      const regions = [];

      for (const match of confirmed) {
        const page = await document.getPage(match.box.pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        regions.push(
          percentRectToPdfRegion(
            { height: viewport.height, width: viewport.width },
            match.box.pageNumber,
            match.box,
          ),
        );
        page.cleanup();
      }

      let bytes: ArrayBuffer = await selectedFile.file.arrayBuffer();
      let totalPages = document.numPages;

      if (regions.length > 0 || report.hiddenTextPages.length > 0) {
        const redacted = await redactPdf(selectedFile.file, {
          rasterizePages: report.hiddenTextPages,
          regions,
          sourceName: selectedFile.file.name,
        });
        bytes = redacted.outputBytes;
        totalPages = redacted.totalPages;
      }

      const sanitized = await sanitizePdfBuffer(
        bytes,
        defaultPrivacySanitizeOptions,
        selectedFile.file.name,
      );

      setOutput({
        bytes: sanitized.outputBytes,
        filename: createOutputName(selectedFile.file.name, {
          suffix: "redacted",
        }),
        totalPages,
      });
      setStatus("success");
      setMessage("Redacted PDF is ready");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "PDFForge could not redact this PDF.",
      );
    }
  }

  function processAnother() {
    setMatches([]);
    setReport(null);
    setOutput(null);
    setStatus("idle");
    setClearSignal((signal) => signal + 1);
  }

  if (status === "success" && output) {
    return (
      <DownloadResultCard
        description={`${output.totalPages} pages processed locally. Confirmed identifiers were rasterized and common metadata was stripped.`}
        onDownload={() =>
          createDownload(
            new Blob([output.bytes], { type: "application/pdf" }),
            { filename: output.filename },
          )
        }
        onProcessAnother={processAnother}
        title="Your redacted PDF is ready"
      />
    );
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={["pdf"]}
        clearSignal={clearSignal}
        multiple={false}
        onFilesChange={handleFilesChange}
      />

      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {privacyRiskChips.map((chip) => {
          const count = counts?.[chip.kind] ?? 0;
          const active = count > 0;

          return (
            <li
              className={
                active
                  ? "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900"
                  : "rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700"
              }
              key={chip.kind}
            >
              <span className="text-zinc-500">• </span>
              {chip.label}
              {active ? (
                <span className="ml-2 text-xs font-bold text-red-700">
                  {count}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {selectedFile && document ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
          <MatchPreview
            document={document}
            matches={matches.filter(
              (match) => match.box.pageNumber === pageNumber,
            )}
            pageNumber={pageNumber}
          />
          <div>
            <label className="block text-sm font-bold">
              Page
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
                onChange={(event) => setPageNumber(Number(event.target.value))}
                value={pageNumber}
              >
                {Array.from({ length: document.numPages }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Page {index + 1}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={matches.length === 0}
                onClick={() =>
                  setMatches((current) =>
                    current.map((match) => ({ ...match, confirmed: true })),
                  )
                }
                type="button"
                variant="secondary"
              >
                Confirm all
              </Button>
              <Button
                className="hidden md:inline-flex"
                disabled={!canExport}
                onClick={() => void exportRedactedPdf()}
                type="button"
              >
                Download redacted PDF
              </Button>
            </div>
            <ul className="mt-4 space-y-2">
              {status === "scanning" ? (
                <li className="text-sm text-zinc-600">Scanning locally…</li>
              ) : matches.length === 0 ? (
                <li className="text-sm text-zinc-600">
                  No text-layer identifiers on this file. Structure notes still
                  appear below.
                </li>
              ) : (
                matches.map((match) => (
                  <li
                    className="rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                    key={match.id}
                  >
                    <label className="flex min-h-11 items-start gap-3 font-bold">
                      <input
                        checked={match.confirmed}
                        className="mt-1 size-4 accent-red-600"
                        onChange={() =>
                          setMatches((current) =>
                            current.map((item) =>
                              item.id === match.id
                                ? { ...item, confirmed: !item.confirmed }
                                : item,
                            ),
                          )
                        }
                        type="checkbox"
                      />
                      <span>
                        <span className="block text-xs font-bold tracking-wide text-red-600 uppercase">
                          {privacyRiskLabels[match.kind]} · page{" "}
                          {match.box.pageNumber}
                        </span>
                        <span className="mt-1 block font-semibold text-zinc-950">
                          {match.text}
                        </span>
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
            {report?.notes.length ? (
              <div className="mt-5 space-y-3">
                {report.notes.map((note) => (
                  <section
                    className="rounded-lg border border-zinc-200 px-3 py-3"
                    key={note.kind}
                  >
                    <h3 className="text-sm font-black">{note.title}</h3>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-600">
                      {note.samples.slice(0, 6).map((sample) => (
                        <li key={sample}>{sample}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {status === "scanning" || status === "processing" ? (
        <p
          className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {status === "idle" && message !== "Ready" ? (
        <p className="mt-6 text-sm font-semibold text-zinc-700" role="status">
          {message}
        </p>
      ) : null}

      {status === "error" ? (
        <div className="mt-8">
          <ErrorState
            description={message}
            title="Privacy risk scan failed"
          />
        </div>
      ) : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canExport}
        label="Download redacted PDF"
        onClick={() => void exportRedactedPdf()}
      />
    </div>
  );
}

function MatchPreview({
  document,
  matches,
  pageNumber,
}: {
  document: PDFDocumentProxy;
  matches: readonly ListedMatch[];
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    async function renderPage(renderCanvas: HTMLCanvasElement) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.15 });
      const context = renderCanvas.getContext("2d", { alpha: false });

      if (!context || cancelled) {
        page.cleanup();
        return;
      }

      renderCanvas.width = Math.floor(viewport.width);
      renderCanvas.height = Math.floor(viewport.height);
      context.fillStyle = "white";
      context.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
      await page.render({
        canvas: renderCanvas,
        canvasContext: context,
        viewport,
      }).promise;
      page.cleanup();
    }

    void renderPage(canvas);

    return () => {
      cancelled = true;
    };
  }, [document, pageNumber]);

  return (
    <div
      aria-label="Highlighted matches on the current page"
      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
    >
      <canvas className="block w-full" ref={canvasRef} />
      {matches.map((match) => (
        <span
          aria-hidden="true"
          className={
            match.confirmed
              ? "pointer-events-none absolute bg-black/75"
              : "pointer-events-none absolute bg-amber-400/55"
          }
          key={match.id}
          style={{
            height: `${match.box.height}%`,
            left: `${match.box.left}%`,
            top: `${match.box.top}%`,
            width: `${match.box.width}%`,
          }}
        />
      ))}
    </div>
  );
}
