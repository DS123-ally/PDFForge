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
import { createDownload } from "@/lib/files/create-download";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";
import {
  percentRectToPdfRegion,
  redactPdf,
  type RedactionRegion,
} from "@/lib/pdf/redact-pdf";

type PercentRect = {
  height: number;
  id: string;
  left: number;
  pageNumber: number;
  top: number;
  width: number;
};

export function RedactPdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [regions, setRegions] = useState<PercentRect[]>([]);
  const [left, setLeft] = useState(10);
  const [top, setTop] = useState(10);
  const [width, setWidth] = useState(40);
  const [height, setHeight] = useState(12);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: ArrayBuffer;
    filename: string;
    totalPages: number;
  } | null>(null);
  const selectedFile = files[0];
  const canRedact =
    Boolean(selectedFile && document && regions.length > 0) &&
    status !== "processing";

  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setRegions([]);
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

  function addTypedRegion() {
    setRegions((current) => [
      ...current,
      {
        height,
        id: createRegionId(),
        left,
        pageNumber,
        top,
        width,
      },
    ]);
  }

  function addDrawnRegion(rect: Omit<PercentRect, "id" | "pageNumber">) {
    setRegions((current) => [
      ...current,
      {
        ...rect,
        id: createRegionId(),
        pageNumber,
      },
    ]);
  }

  async function runRedaction() {
    if (!selectedFile || !document) {
      return;
    }

    setStatus("processing");
    setMessage("Rasterizing redacted pages locally");
    setOutput(null);

    try {
      const pdfRegions: RedactionRegion[] = [];

      for (const region of regions) {
        const page = await document.getPage(region.pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        pdfRegions.push(
          percentRectToPdfRegion(
            { height: viewport.height, width: viewport.width },
            region.pageNumber,
            region,
          ),
        );
        page.cleanup();
      }

      const result = await redactPdf(selectedFile.file, {
        regions: pdfRegions,
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

  function downloadResult() {
    if (!output) {
      return;
    }

    createDownload(new Blob([output.bytes], { type: "application/pdf" }), {
      filename: output.filename,
    });
  }

  function processAnother() {
    setRegions([]);
    setOutput(null);
    setStatus("idle");
    setClearSignal((signal) => signal + 1);
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
          <h2 className="text-lg font-black">Redaction regions</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Selected areas are rasterized and filled black. Covered text is not
            left in the output text layer.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
            <RedactPagePreview
              document={document}
              onAddRegion={addDrawnRegion}
              pageNumber={pageNumber}
              regions={regions.filter(
                (region) => region.pageNumber === pageNumber,
              )}
            />
            <div className="grid gap-3">
              <label className="block text-sm font-bold">
                Page
                <select
                  className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
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
              <NumberField label="Left %" onChange={setLeft} value={left} />
              <NumberField label="Top %" onChange={setTop} value={top} />
              <NumberField label="Width %" onChange={setWidth} value={width} />
              <NumberField
                label="Height %"
                onChange={setHeight}
                value={height}
              />
              <Button
                onClick={addTypedRegion}
                type="button"
                variant="secondary"
              >
                Add region
              </Button>
              <ul className="space-y-2 text-sm">
                {regions.map((region) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2"
                    key={region.id}
                  >
                    <span>
                      Page {region.pageNumber}: {Math.round(region.width)}% ×{" "}
                      {Math.round(region.height)}%
                    </span>
                    <Button
                      className="min-h-11 px-3"
                      onClick={() =>
                        setRegions((current) =>
                          current.filter((item) => item.id !== region.id),
                        )
                      }
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-5 hidden justify-end md:flex">
            <Button
              disabled={!canRedact}
              onClick={() => void runRedaction()}
              type="button"
            >
              Redact PDF
            </Button>
          </div>
        </section>
      ) : null}

      {status === "processing" ? (
        <p
          className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {status === "error" ? (
        <div className="mt-8">
          <ErrorState description={message} title="Redaction failed" />
        </div>
      ) : null}

      {status === "success" && output ? (
        <div className="mt-8">
          <DownloadResultCard
            description={`${output.totalPages} pages processed locally. Redacted pages are image-based.`}
            downloadLabel="Download PDF"
            onDownload={downloadResult}
            onProcessAnother={processAnother}
            title="Your PDF is ready"
          />
        </div>
      ) : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canRedact}
        label="Redact PDF"
        onClick={() => void runRedaction()}
      />
    </div>
  );
}

function RedactPagePreview({
  document,
  onAddRegion,
  pageNumber,
  regions,
}: {
  document: PDFDocumentProxy;
  onAddRegion: (rect: Omit<PercentRect, "id" | "pageNumber">) => void;
  pageNumber: number;
  regions: readonly PercentRect[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Omit<
    PercentRect,
    "id" | "pageNumber"
  > | null>(null);

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

    const point = pointerPercent(event);
    setDraft(toPercentRect(startRef.current, point));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) {
      return;
    }

    const rect = toPercentRect(startRef.current, pointerPercent(event));
    startRef.current = null;
    setDraft(null);

    if (rect.width > 1 && rect.height > 1) {
      onAddRegion(rect);
    }
  }

  const overlayRegions = useMemo(
    () =>
      draft ? [...regions, { ...draft, id: "draft", pageNumber }] : regions,
    [draft, pageNumber, regions],
  );

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="application"
      aria-label="Draw redaction regions on the current page"
    >
      <canvas className="block w-full" ref={canvasRef} />
      {overlayRegions.map((region) => (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bg-black/80"
          key={region.id}
          style={{
            height: `${region.height}%`,
            left: `${region.left}%`,
            top: `${region.top}%`,
            width: `${region.width}%`,
          }}
        />
      ))}
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
        className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
        max={100}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function toPercentRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  return {
    height: Math.abs(end.y - start.y),
    left,
    top,
    width: Math.abs(end.x - start.x),
  };
}

function createRegionId() {
  return `region-${crypto.randomUUID?.() ?? Date.now()}`;
}
