"use client";

import { ArrowDown, ArrowUp, RotateCw, Trash2, Undo2 } from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import {
  type DragEvent,
  useCallback,
  useEffect,
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
import { ProcessingCard } from "@/components/tools/processing-card";
import { Button } from "@/components/ui/button";
import { createDownload } from "@/lib/files/create-download";
import { destroyLoadingTask, getPdfJs } from "@/lib/pdf/pdfjs";
import { getCanvasPixelSize, getThumbnailScale } from "@/lib/pdf/viewer-utils";
import { cn } from "@/lib/utils";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";

type OrganizedPage = {
  id: string;
  pageNumber: number;
  rotation: number;
  selected: boolean;
};

export function OrganizePdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [pages, setPages] = useState<OrganizedPage[]>([]);
  const [undoStack, setUndoStack] = useState<OrganizedPage[][]>([]);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const selectedFile = files[0];
  const selectedCount = pages.filter((page) => page.selected).length;
  const canSave = Boolean(
    selectedFile && pages.length > 0 && state.status !== "processing",
  );
  const resultDescription = state.result
    ? `${state.result.totalPages} pages saved in your organized PDF.`
    : "";

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      setPages(createOrganizedPages(nextFiles[0]));
      setUndoStack([]);
      reset();
    },
    [reset],
  );

  function updatePages(
    update: (currentPages: OrganizedPage[]) => OrganizedPage[],
  ) {
    setPages((currentPages) => {
      const nextPages = update(currentPages);

      if (nextPages === currentPages) {
        return currentPages;
      }

      setUndoStack((currentStack) => [...currentStack.slice(-9), currentPages]);
      return nextPages;
    });
  }

  function movePage(pageId: string, direction: "up" | "down") {
    updatePages((currentPages) => {
      const currentIndex = currentPages.findIndex((page) => page.id === pageId);
      const nextIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentPages.length
      ) {
        return currentPages;
      }

      return reorder(currentPages, currentIndex, nextIndex);
    });
  }

  function dropPage(targetPageId: string) {
    if (!draggedPageId || draggedPageId === targetPageId) {
      return;
    }

    updatePages((currentPages) => {
      const fromIndex = currentPages.findIndex(
        (page) => page.id === draggedPageId,
      );
      const toIndex = currentPages.findIndex(
        (page) => page.id === targetPageId,
      );

      if (fromIndex < 0 || toIndex < 0) {
        return currentPages;
      }

      return reorder(currentPages, fromIndex, toIndex);
    });
    setDraggedPageId(null);
  }

  function rotatePage(pageId: string) {
    updatePages((currentPages) =>
      currentPages.map((page) =>
        page.id === pageId
          ? { ...page, rotation: (page.rotation + 90) % 360 }
          : page,
      ),
    );
  }

  function rotateSelected() {
    updatePages((currentPages) =>
      currentPages.map((page) =>
        page.selected
          ? { ...page, rotation: (page.rotation + 90) % 360 }
          : page,
      ),
    );
  }

  function deletePage(pageId: string) {
    updatePages((currentPages) =>
      currentPages.filter((page) => page.id !== pageId),
    );
  }

  function deleteSelected() {
    updatePages((currentPages) =>
      currentPages.filter((page) => !page.selected),
    );
  }

  function togglePage(pageId: string) {
    setPages((currentPages) =>
      currentPages.map((page) =>
        page.id === pageId ? { ...page, selected: !page.selected } : page,
      ),
    );
  }

  function setSelection(selected: boolean) {
    setPages((currentPages) =>
      currentPages.map((page) => ({ ...page, selected })),
    );
  }

  function undo() {
    setUndoStack((currentStack) => {
      const previousPages = currentStack.at(-1);

      if (!previousPages) {
        return currentStack;
      }

      setPages(previousPages);
      return currentStack.slice(0, -1);
    });
  }

  function saveOrganizedPdf() {
    if (!selectedFile) {
      return;
    }

    void start([selectedFile], "organize", {
      organize: {
        pages: pages.map(({ id, pageNumber, rotation }) => ({
          id,
          pageNumber,
          rotation,
        })),
      },
    });
  }

  function downloadResult() {
    const result = state.result;

    if (!result?.outputBytes) {
      return;
    }

    createDownload(
      new Blob([result.outputBytes], { type: "application/pdf" }),
      {
        filename: result.filename,
      },
    );
  }

  function processAnother() {
    reset();
    setPages([]);
    setUndoStack([]);
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

      {selectedFile ? (
        <section
          aria-labelledby="organize-settings-title"
          className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black" id="organize-settings-title">
                Organize pages
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Reorder, rotate, select, or delete pages before saving.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pages.length === 0}
                onClick={() => setSelection(true)}
                type="button"
                variant="secondary"
              >
                Select all
              </Button>
              <Button
                disabled={selectedCount === 0}
                onClick={() => setSelection(false)}
                type="button"
                variant="secondary"
              >
                Clear selection
              </Button>
              <Button
                disabled={selectedCount === 0}
                onClick={rotateSelected}
                type="button"
                variant="secondary"
              >
                <RotateCw aria-hidden="true" className="size-4" />
                Rotate selected
              </Button>
              <Button
                disabled={selectedCount === 0 || selectedCount === pages.length}
                onClick={deleteSelected}
                type="button"
                variant="secondary"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete selected
              </Button>
              <Button
                disabled={undoStack.length === 0}
                onClick={undo}
                type="button"
                variant="ghost"
              >
                <Undo2 aria-hidden="true" className="size-4" />
                Undo
              </Button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-zinc-700" role="status">
            {pages.length} {pages.length === 1 ? "page" : "pages"} will be
            saved. {selectedCount} selected.
          </p>

          <OrganizeThumbnailGrid
            draggedPageId={draggedPageId}
            file={selectedFile.file}
            onDelete={deletePage}
            onDragEnd={() => setDraggedPageId(null)}
            onDragStart={setDraggedPageId}
            onDrop={dropPage}
            onMoveDown={(pageId) => movePage(pageId, "down")}
            onMoveUp={(pageId) => movePage(pageId, "up")}
            onRotate={rotatePage}
            onToggle={togglePage}
            pages={pages}
          />

          <div className="mt-5 hidden justify-end md:flex">
            <Button
              disabled={!canSave}
              onClick={saveOrganizedPdf}
              type="button"
            >
              Save organized PDF
            </Button>
          </div>
        </section>
      ) : null}

      {state.status !== "idle" && state.status !== "success" ? (
        <div className="mt-8">
          <ProcessingCard onCancel={cancel} onReset={reset} state={state} />
        </div>
      ) : null}

      {state.status === "success" && state.result?.outputBytes ? (
        <div className="mt-8">
          <DownloadResultCard
            description={resultDescription}
            downloadLabel="Download organized PDF"
            onDownload={downloadResult}
            onProcessAnother={processAnother}
            title="Your organized PDF is ready"
          />
        </div>
      ) : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canSave}
        label="Save organized PDF"
        onClick={saveOrganizedPdf}
      />
    </div>
  );
}

type OrganizeThumbnailGridProps = {
  draggedPageId: string | null;
  file: File;
  onDelete: (pageId: string) => void;
  onDragEnd: () => void;
  onDragStart: (pageId: string) => void;
  onDrop: (pageId: string) => void;
  onMoveDown: (pageId: string) => void;
  onMoveUp: (pageId: string) => void;
  onRotate: (pageId: string) => void;
  onToggle: (pageId: string) => void;
  pages: OrganizedPage[];
};

function OrganizeThumbnailGrid({
  draggedPageId,
  file,
  onDelete,
  onDragEnd,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onRotate,
  onToggle,
  pages,
}: OrganizeThumbnailGridProps) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function loadDocument() {
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
    }

    void loadDocument();

    return () => {
      cancelled = true;
      destroyLoadingTask(loadingTask);
      void loadedDocument?.cleanup();
    };
  }, [file]);

  if (!document) {
    return (
      <div
        className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm font-semibold text-zinc-600"
        role="status"
      >
        Loading page thumbnails
      </div>
    );
  }

  return (
    <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pages.map((page, index) => (
        <OrganizePageCard
          canMoveDown={index < pages.length - 1}
          canMoveUp={index > 0}
          document={document}
          isDragging={draggedPageId === page.id}
          key={page.id}
          onDelete={() => onDelete(page.id)}
          onDragEnd={onDragEnd}
          onDragStart={() => onDragStart(page.id)}
          onDrop={() => onDrop(page.id)}
          onMoveDown={() => onMoveDown(page.id)}
          onMoveUp={() => onMoveUp(page.id)}
          onRotate={() => onRotate(page.id)}
          onToggle={() => onToggle(page.id)}
          page={page}
        />
      ))}
    </ol>
  );
}

type OrganizePageCardProps = {
  canMoveDown: boolean;
  canMoveUp: boolean;
  document: PDFDocumentProxy;
  isDragging: boolean;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRotate: () => void;
  onToggle: () => void;
  page: OrganizedPage;
};

function OrganizePageCard({
  canMoveDown,
  canMoveUp,
  document,
  isDragging,
  onDelete,
  onDragEnd,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onRotate,
  onToggle,
  page,
}: OrganizePageCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    async function renderPage(renderCanvas: HTMLCanvasElement) {
      try {
        const pdfPage = await document.getPage(page.pageNumber);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = getThumbnailScale(baseViewport.width, 132);
        const viewport = pdfPage.getViewport({
          rotation: page.rotation,
          scale,
        });
        const context = renderCanvas.getContext("2d", { alpha: false });

        if (!context || cancelled) {
          pdfPage.cleanup();
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

        const renderTask = pdfPage.render({
          canvas: renderCanvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        pdfPage.cleanup();
      } catch (error) {
        if (!cancelled && !isRenderCancelled(error)) {
          setHasError(true);
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
  }, [document, page.pageNumber, page.rotation]);

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  return (
    <li
      className={cn(
        "rounded-xl border bg-white p-3 shadow-sm",
        page.selected
          ? "border-red-500 ring-2 ring-red-100"
          : "border-zinc-200",
        isDragging && "opacity-50",
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input
            checked={page.selected}
            className="size-4 accent-red-600"
            onChange={onToggle}
            type="checkbox"
          />
          Page {page.pageNumber}
        </label>
        <span className="text-xs font-semibold text-zinc-500">
          {page.rotation} deg
        </span>
      </div>
      <div className="mt-3 flex min-h-40 items-center justify-center overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 p-2">
        {hasError ? (
          <span className="text-sm font-semibold text-red-700">
            Preview failed
          </span>
        ) : (
          <canvas
            aria-label={`Thumbnail for page ${page.pageNumber}`}
            className="bg-white shadow-sm"
            ref={canvasRef}
          />
        )}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        <Button
          aria-label={`Move page ${page.pageNumber} up`}
          className="size-11 p-0"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          type="button"
          variant="ghost"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label={`Move page ${page.pageNumber} down`}
          className="size-11 p-0"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          type="button"
          variant="ghost"
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label={`Rotate page ${page.pageNumber}`}
          className="size-11 p-0"
          onClick={onRotate}
          type="button"
          variant="ghost"
        >
          <RotateCw aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label={`Delete page ${page.pageNumber}`}
          className="col-span-2 min-h-11 px-3"
          disabled={false}
          onClick={onDelete}
          type="button"
          variant="ghost"
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

function reorder<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (!movedItem) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function createOrganizedPages(file: LocalUploadedFile | undefined) {
  if (!file?.pageCount) {
    return [];
  }

  return Array.from({ length: file.pageCount }, (_, index) => ({
    id: `${file.id}-page-${index + 1}`,
    pageNumber: index + 1,
    rotation: 0,
    selected: false,
  }));
}

function isRenderCancelled(error: unknown) {
  return error instanceof Error && error.name === "RenderingCancelledException";
}
