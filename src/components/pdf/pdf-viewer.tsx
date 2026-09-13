"use client";

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useMemo, useState } from "react";

import { PdfPageCanvas } from "@/components/pdf/pdf-page-canvas";
import { PdfPageThumbnail } from "@/components/pdf/pdf-page-thumbnail";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";
import {
  clampZoom,
  createPageRange,
  formatPageCount,
  getNextZoom,
  maxZoom,
  minZoom,
} from "@/lib/pdf/viewer-utils";

type PdfViewerProps = {
  file: File;
};

export function PdfViewer({ file }: PdfViewerProps) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(1);
  const [zoom, setZoom] = useState(1);

  const pageNumbers = useMemo(
    () => createPageRange(document?.numPages ?? 0),
    [document?.numPages],
  );

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function loadDocument() {
      setIsLoading(true);
      setError(null);
      setDocument(null);
      setSelectedPage(1);
      setZoom(1);

      try {
        const pdfjs = await getPdfJs();
        const buffer = await file.arrayBuffer();
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
      } catch (loadError) {
        if (!cancelled) {
          setError(getViewerErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      destroyLoadingTask(loadingTask);
      void loadedDocument?.cleanup();
    };
  }, [file]);

  function changePage(nextPage: number) {
    if (!document) {
      return;
    }

    setSelectedPage(Math.min(document.numPages, Math.max(1, nextPage)));
  }

  return (
    <section
      aria-labelledby="pdf-viewer-title"
      className="mt-8 border-t border-zinc-200 pt-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-red-600 uppercase">
            Preview
          </p>
          <h2
            className="mt-1 truncate text-2xl font-black tracking-tight"
            id="pdf-viewer-title"
            title={file.name}
          >
            {file.name}
          </h2>
          {document ? (
            <p className="mt-1 text-sm text-zinc-600">
              {formatPageCount(document.numPages)}
            </p>
          ) : null}
        </div>

        {document ? (
          <div
            aria-label="PDF preview controls"
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
          >
            <Button
              aria-label="Previous page"
              className="size-11 p-0"
              disabled={selectedPage === 1}
              onClick={() => changePage(selectedPage - 1)}
              type="button"
              variant="secondary"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Button>
            <span className="min-w-24 text-center text-sm font-bold">
              {selectedPage} / {document.numPages}
            </span>
            <Button
              aria-label="Next page"
              className="size-11 p-0"
              disabled={selectedPage === document.numPages}
              onClick={() => changePage(selectedPage + 1)}
              type="button"
              variant="secondary"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </Button>
            <Button
              aria-label="Zoom out"
              className="size-11 p-0"
              disabled={zoom <= minZoom}
              onClick={() =>
                setZoom((currentZoom) => getNextZoom(currentZoom, "out"))
              }
              type="button"
              variant="secondary"
            >
              <ZoomOut aria-hidden="true" className="size-5" />
            </Button>
            <span className="min-w-14 text-center text-sm font-bold">
              {Math.round(clampZoom(zoom) * 100)}%
            </span>
            <Button
              aria-label="Zoom in"
              className="size-11 p-0"
              disabled={zoom >= maxZoom}
              onClick={() =>
                setZoom((currentZoom) => getNextZoom(currentZoom, "in"))
              }
              type="button"
              variant="secondary"
            >
              <ZoomIn aria-hidden="true" className="size-5" />
            </Button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div
          className="mt-6 flex min-h-72 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-600"
          role="status"
        >
          <Loader2 aria-hidden="true" className="mr-2 size-5 animate-spin" />
          Loading PDF preview
        </div>
      ) : null}

      {error ? (
        <div className="mt-6">
          <ErrorState title="Preview unavailable" description={error} />
        </div>
      ) : null}

      {document ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside aria-label="PDF pages" className="min-w-0">
            <ol className="flex snap-x gap-3 overflow-x-auto pb-2 lg:max-h-[38rem] lg:snap-y lg:flex-col lg:overflow-y-auto lg:pr-2">
              {pageNumbers.map((pageNumber) => (
                <PdfPageThumbnail
                  document={document}
                  isSelected={selectedPage === pageNumber}
                  key={pageNumber}
                  onSelect={() => setSelectedPage(pageNumber)}
                  pageNumber={pageNumber}
                />
              ))}
            </ol>
          </aside>
          <PdfPageCanvas
            document={document}
            pageNumber={selectedPage}
            zoom={zoom}
          />
        </div>
      ) : null}
    </section>
  );
}

function getViewerErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    (error.name === "PasswordException" ||
      error.message.toLowerCase().includes("password"))
  ) {
    return "This PDF is password protected.";
  }

  return "This PDF could not be rendered in the browser.";
}
