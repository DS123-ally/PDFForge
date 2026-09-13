"use client";

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { getCanvasPixelSize } from "@/lib/pdf/viewer-utils";

type PdfPageCanvasProps = {
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
};

export function PdfPageCanvas({
  document,
  pageNumber,
  zoom,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    async function renderPage(renderCanvas: HTMLCanvasElement) {
      setStatus("loading");
      renderTaskRef.current?.cancel();

      try {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom });
        const context = renderCanvas.getContext("2d", { alpha: false });

        if (!context || cancelled) {
          page.cleanup();
          return;
        }

        const pixelSize = getCanvasPixelSize(
          viewport.width,
          viewport.height,
          window.devicePixelRatio,
        );

        renderCanvas.width = pixelSize.width;
        renderCanvas.height = pixelSize.height;
        renderCanvas.style.width = `${viewport.width}px`;
        renderCanvas.style.height = `${viewport.height}px`;

        context.setTransform(
          pixelSize.outputScale,
          0,
          0,
          pixelSize.outputScale,
          0,
          0,
        );
        context.fillStyle = "white";
        context.fillRect(0, 0, viewport.width, viewport.height);

        const renderTask = page.render({
          canvas: renderCanvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) {
          setStatus("ready");
        }

        page.cleanup();
      } catch (error) {
        if (!cancelled && !isRenderCancelled(error)) {
          setStatus("error");
        }
      }
    }

    void renderPage(canvas);

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [document, pageNumber, zoom]);

  return (
    <div className="relative min-h-80 overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-3">
      {status === "loading" ? (
        <div className="absolute inset-x-4 top-4 z-10 rounded-lg bg-white/90 p-3 shadow-sm">
          <ProgressIndicator label="Rendering page" />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-4 z-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          This page could not be rendered.
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        aria-label={`Rendered PDF page ${pageNumber}`}
        className="mx-auto bg-white shadow-sm"
      />
    </div>
  );
}

function isRenderCancelled(error: unknown) {
  return error instanceof Error && error.name === "RenderingCancelledException";
}
