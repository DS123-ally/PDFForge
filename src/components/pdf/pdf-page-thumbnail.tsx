"use client";

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { getCanvasPixelSize, getThumbnailScale } from "@/lib/pdf/viewer-utils";

type PdfPageThumbnailProps = {
  document: PDFDocumentProxy;
  isSelected: boolean;
  onSelect: () => void;
  pageNumber: number;
};

export function PdfPageThumbnail({
  document,
  isSelected,
  onSelect,
  pageNumber,
}: PdfPageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const node = itemRef.current;

    if (!node) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = globalThis.setTimeout(() => setIsVisible(true), 0);
      return () => globalThis.clearTimeout(fallbackTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let cancelled = false;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    async function renderThumbnail(renderCanvas: HTMLCanvasElement) {
      try {
        const page = await document.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = getThumbnailScale(baseViewport.width);
        const viewport = page.getViewport({ scale });
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
        page.cleanup();
      } catch (error) {
        if (!cancelled && !isRenderCancelled(error)) {
          setHasError(true);
        }
      }
    }

    void renderThumbnail(canvas);

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [document, isVisible, pageNumber]);

  return (
    <li className="snap-start" ref={itemRef}>
      <button
        aria-current={isSelected ? "page" : undefined}
        aria-label={`Show page ${pageNumber}`}
        className={cn(
          "flex min-h-40 w-36 flex-col items-center gap-2 rounded-lg border p-2 text-xs font-bold transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
          isSelected
            ? "border-red-600 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
        )}
        onClick={onSelect}
        type="button"
      >
        <span className="flex min-h-28 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100">
          {hasError ? (
            <span className="px-3 text-center text-red-700">
              Preview failed
            </span>
          ) : (
            <canvas ref={canvasRef} aria-hidden="true" className="bg-white" />
          )}
        </span>
        Page {pageNumber}
      </button>
    </li>
  );
}

function isRenderCancelled(error: unknown) {
  return error instanceof Error && error.name === "RenderingCancelledException";
}
