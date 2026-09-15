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
import { findPiiInDocument } from "@/lib/pdf/find-pii-pdf";
import {
  piiPresetLabels,
  type PiiMatch,
  type PiiPreset,
} from "@/lib/pdf/find-pii";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";
import { percentRectToPdfRegion, redactPdf } from "@/lib/pdf/redact-pdf";

type ListedMatch = PiiMatch & { confirmed: boolean; id: string };

const allPresets: PiiPreset[] = ["email", "phone", "id"];

export function FindRedactWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [presets, setPresets] = useState<PiiPreset[]>(allPresets);
  const [customPhrase, setCustomPhrase] = useState("");
  const [matches, setMatches] = useState<ListedMatch[]>([]);
  const [status, setStatus] = useState<
    "idle" | "searching" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: ArrayBuffer;
    filename: string;
    totalPages: number;
  } | null>(null);
  const selectedFile = files[0];
  const confirmed = matches.filter((match) => match.confirmed);
  const canSearch =
    Boolean(selectedFile && document) && status !== "processing";
  const canRedact =
    Boolean(selectedFile && document && confirmed.length > 0) &&
    status !== "processing" &&
    status !== "searching";

  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setMatches([]);
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

  async function searchMatches() {
    if (!document) {
      return;
    }

    setStatus("searching");
    setMessage("Searching the text layer locally");
    setOutput(null);

    try {
      const found = await findPiiInDocument(document, {
        customPhrase,
        presets,
      });
      setMatches(
        found.map((match, index) => ({
          ...match,
          confirmed: false,
          id: `match-${index}-${match.text}`,
        })),
      );
      setStatus("idle");
      setMessage(
        found.length === 0
          ? "No text-layer matches. Scanned pages without selectable text will not appear."
          : `${found.length} match${found.length === 1 ? "" : "es"} found. Confirm each one before redacting.`,
      );
    } catch {
      setStatus("error");
      setMessage("PDFForge could not search this PDF.");
    }
  }

  async function runRedaction() {
    if (!selectedFile || !document || confirmed.length === 0) {
      return;
    }

    setStatus("processing");
    setMessage("Rasterizing confirmed matches locally");
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

      const result = await redactPdf(selectedFile.file, {
        regions,
        sourceName: selectedFile.file.name,
      });
      setOutput({
        bytes: result.outputBytes,
        filename: result.filename,
        totalPages: result.totalPages,
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
    setOutput(null);
    setStatus("idle");
    setClearSignal((signal) => signal + 1);
  }

  function togglePreset(preset: PiiPreset) {
    setPresets((current) =>
      current.includes(preset)
        ? current.filter((item) => item !== preset)
        : [...current, preset],
    );
  }

  if (status === "success" && output) {
    return (
      <DownloadResultCard
        description={`${output.totalPages} pages processed locally. Confirmed matches were rasterized black.`}
        onDownload={() =>
          createDownload(
            new Blob([output.bytes], { type: "application/pdf" }),
            {
              filename: output.filename,
            },
          )
        }
        onProcessAnother={processAnother}
        title="Your PDF is ready"
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

      {selectedFile && document ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Find PII in the text layer</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Pick patterns or type a phrase. Matches are highlighted for review.
            Only confirmed hits are rasterized with the same redaction path as
            Redact PDF. Scanned pages without a text layer will not match.
          </p>
          <fieldset className="mt-4">
            <legend className="text-sm font-bold">Patterns</legend>
            <ul className="mt-2 space-y-2">
              {allPresets.map((preset) => (
                <li key={preset}>
                  <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
                    <input
                      checked={presets.includes(preset)}
                      className="size-4 accent-red-600"
                      onChange={() => togglePreset(preset)}
                      type="checkbox"
                    />
                    {piiPresetLabels[preset]}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <label className="mt-4 block text-sm font-bold">
            Custom phrase
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm font-normal"
              onChange={(event) => setCustomPhrase(event.target.value)}
              placeholder="Exact words to find"
              value={customPhrase}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={!canSearch || status === "searching"}
              onClick={() => void searchMatches()}
              type="button"
            >
              Find matches
            </Button>
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
          </div>
        </section>
      ) : null}

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
            <ul className="mt-4 space-y-2">
              {matches.length === 0 ? (
                <li className="text-sm text-zinc-600">
                  Run Find matches to list hits.
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
                          {match.kind} · page {match.box.pageNumber}
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
            <div className="mt-5 hidden md:block">
              <Button
                disabled={!canRedact}
                onClick={() => void runRedaction()}
                type="button"
              >
                Redact confirmed matches
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {status === "searching" || status === "processing" ? (
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
          <ErrorState description={message} title="Find and redact failed" />
        </div>
      ) : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={matches.length === 0 ? !canSearch : !canRedact}
        label={
          matches.length === 0 ? "Find matches" : "Redact confirmed matches"
        }
        onClick={() =>
          void (matches.length === 0 ? searchMatches() : runRedaction())
        }
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
