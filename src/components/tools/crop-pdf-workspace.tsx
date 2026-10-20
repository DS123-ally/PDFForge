"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { createDownload } from "@/lib/files/create-download";
import {
  CropPdfError,
  cropFidelity,
  cropPdf,
  defaultCropRect,
  normalizeCropRect,
  type CropMode,
  type CropRect,
} from "@/lib/pdf/crop-pdf";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";

const modes: CropMode[] = ["boxes", "pictures"];
const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100";

export function CropPdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [mode, setMode] = useState<CropMode>("boxes");
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [ranges, setRanges] = useState("");
  const [rect, setRect] = useState<CropRect>(defaultCropRect);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: Uint8Array;
    filename: string;
    pageCount: number;
    warnings: string[];
  } | null>(null);
  const selectedFile = files[0];
  const canCrop =
    Boolean(selectedFile && document) &&
    rect.width >= 2 &&
    rect.height >= 2 &&
    status !== "processing";

  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setPageNumber(1);
    setRect(defaultCropRect);
    setOutput(null);
    setStatus("idle");
    setMessage("Ready");
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

  async function crop() {
    if (!selectedFile) {
      return;
    }

    setStatus("processing");
    setMessage(
      mode === "boxes"
        ? "Resizing page boxes in this tab"
        : "Redrawing cropped pages in this tab",
    );
    setOutput(null);

    try {
      const bytes = new Uint8Array(await selectedFile.file.arrayBuffer());
      const result = await cropPdf(bytes, {
        mode,
        rect,
        selection:
          selectionMode === "custom"
            ? { mode: "custom", ranges }
            : { mode: "all" },
        sourceName: selectedFile.file.name,
      });
      setOutput({
        bytes: result.bytes,
        filename: result.filename,
        pageCount: result.pageCount,
        warnings: result.warnings,
      });
      setStatus("success");
      setMessage("PDF ready");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof CropPdfError
          ? error.message
          : "This PDF could not be cropped.",
      );
    }
  }

  function downloadPdf() {
    if (!output) {
      return;
    }

    createDownload(output.bytes, { filename: output.filename });
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={["pdf"]}
        clearSignal={clearSignal}
        onFilesChange={handleFilesChange}
      />
      <fieldset className="mt-5">
        <legend className="text-xs font-bold tracking-wide text-amber-800 uppercase">
          Fidelity
        </legend>
        <div className="mt-3 grid gap-3">
          {modes.map((entry) => {
            const fidelity = cropFidelity[entry];
            const selected = mode === entry;

            return (
              <label
                className={
                  selected
                    ? "rounded-2xl border border-red-600 bg-amber-50 p-4"
                    : "rounded-2xl border border-zinc-200 bg-white p-4"
                }
                key={entry}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  name="crop-mode"
                  onChange={() => {
                    setMode(entry);
                    setOutput(null);
                    setStatus("idle");
                  }}
                  type="radio"
                  value={entry}
                />
                <h2 className="text-lg font-black text-zinc-950">
                  {fidelity.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {fidelity.detail}
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-5 hidden justify-end md:flex">
        <Button disabled={!canCrop} onClick={() => void crop()} type="button">
          Crop PDF
        </Button>
      </div>

      {selectedFile && document ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Crop box</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Drag on the page, or type percents. The same box is applied to the
            pages you choose.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
            <CropPagePreview
              document={document}
              onChange={setRect}
              pageNumber={pageNumber}
              rect={rect}
            />
            <div className="grid gap-3">
              <label className="block text-sm font-bold">
                Preview page
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setPageNumber(Number(event.target.value))
                  }
                  value={pageNumber}
                >
                  {Array.from({ length: document.numPages }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      Page {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold">
                Pages to crop
                <select
                  className={fieldClass}
                  onChange={(event) =>
                    setSelectionMode(event.target.value as "all" | "custom")
                  }
                  value={selectionMode}
                >
                  <option value="all">All pages</option>
                  <option value="custom">Custom pages</option>
                </select>
              </label>
              {selectionMode === "custom" ? (
                <label className="block text-sm font-bold">
                  Page ranges
                  <input
                    className={fieldClass}
                    onChange={(event) => setRanges(event.target.value)}
                    placeholder="1-3, 5"
                    value={ranges}
                  />
                </label>
              ) : null}
              <NumberField
                label="Left %"
                onChange={(left) =>
                  setRect((current) => normalizeCropRect({ ...current, left }))
                }
                value={rect.left}
              />
              <NumberField
                label="Top %"
                onChange={(top) =>
                  setRect((current) => normalizeCropRect({ ...current, top }))
                }
                value={rect.top}
              />
              <NumberField
                label="Width %"
                onChange={(width) =>
                  setRect((current) => normalizeCropRect({ ...current, width }))
                }
                value={rect.width}
              />
              <NumberField
                label="Height %"
                onChange={(height) =>
                  setRect((current) =>
                    normalizeCropRect({ ...current, height }),
                  )
                }
                value={rect.height}
              />
            </div>
          </div>
        </section>
      ) : null}

      {status === "processing" ? (
        <ProgressIndicator className="mt-5" label={message} />
      ) : null}
      {status === "error" ? (
        <div className="mt-5">
          <ErrorState description={message} title="Crop failed" />
        </div>
      ) : null}
      {output ? (
        <div className="mt-5">
          <DownloadResultCard
            description={`${output.pageCount} pages cropped locally.`}
            downloadLabel="Download PDF"
            onDownload={downloadPdf}
            onProcessAnother={() => {
              setOutput(null);
              setStatus("idle");
              setClearSignal((current) => current + 1);
            }}
            title="Your PDF is ready"
          />
          {output.warnings.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
              {output.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canCrop}
        label="Crop PDF"
        onClick={() => void crop()}
      />
    </div>
  );
}

function CropPagePreview({
  document,
  onChange,
  pageNumber,
  rect,
}: {
  document: PDFDocumentProxy;
  onChange: (rect: CropRect) => void;
  pageNumber: number;
  rect: CropRect;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<CropRect | null>(null);

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

  function pointerPercent(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointerPercent(event);
    startRef.current = point;
    setDraft({ height: 0, left: point.x, top: point.y, width: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) {
      return;
    }

    setDraft(toCropRect(startRef.current, pointerPercent(event)));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) {
      return;
    }

    const next = toCropRect(startRef.current, pointerPercent(event));
    startRef.current = null;
    setDraft(null);

    if (next.width > 1 && next.height > 1) {
      onChange(next);
    }
  }

  const overlay = useMemo(() => draft ?? rect, [draft, rect]);

  return (
    <div
      aria-label="Draw a crop box on the current page"
      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="application"
    >
      <canvas className="block w-full" ref={canvasRef} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute border-2 border-red-600 bg-red-600/15"
        style={{
          height: `${overlay.height}%`,
          left: `${overlay.left}%`,
          top: `${overlay.top}%`,
          width: `${overlay.width}%`,
        }}
      />
    </div>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className={fieldClass}
        max={100}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        step={1}
        type="number"
        value={Math.round(value)}
      />
    </label>
  );
}

function toCropRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  return normalizeCropRect({
    height: Math.abs(end.y - start.y),
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
  });
}
