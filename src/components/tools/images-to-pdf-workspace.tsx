"use client";

import { useCallback, useMemo, useState } from "react";

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
import { formatFileSize } from "@/lib/files/format-file-size";
import type {
  ImageFitMode,
  ImageOrientation,
  ImagePageSize,
} from "@/lib/pdf/image-layout";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";

type ImageDetails = {
  height: number;
  mimeType: string;
  width: number;
};

const largeImageSelectionBytes = 50 * 1024 * 1024;

export function ImagesToPdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [details, setDetails] = useState<Record<string, ImageDetails>>({});
  const [pageSize, setPageSize] = useState<ImagePageSize>("a4");
  const [orientation, setOrientation] = useState<ImageOrientation>("portrait");
  const [margin, setMargin] = useState(24);
  const [fit, setFit] = useState<ImageFitMode>("fit");
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const totalSelectedBytes = useMemo(
    () => files.reduce((total, file) => total + file.file.size, 0),
    [files],
  );
  const canConvert =
    files.length > 0 &&
    files.every((file) => details[file.id]) &&
    state.status !== "processing";

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      reset();
      void hydrateImageDetails(nextFiles).then(setDetails);
    },
    [reset],
  );

  function convertImages() {
    if (!canConvert) {
      return;
    }

    void start(files, "images-to-pdf", {
      imagesToPdf: {
        fit,
        images: files.map((file) => ({
          height: details[file.id]?.height ?? 1,
          id: file.id,
          mimeType: details[file.id]?.mimeType ?? file.file.type,
          width: details[file.id]?.width ?? 1,
        })),
        margin,
        orientation,
        pageSize,
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
    setDetails({});
    setClearSignal((signal) => signal + 1);
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={["image"]}
        allowReorder
        clearSignal={clearSignal}
        multiple
        onFilesChange={handleFilesChange}
      />

      {totalSelectedBytes >= largeImageSelectionBytes ? (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
          role="status"
        >
          Large image selection: {formatFileSize(totalSelectedBytes)}. High
          resolution images can create large PDFs on mobile devices.
        </p>
      ) : null}

      {files.length > 0 ? (
        <section
          aria-labelledby="images-settings-title"
          className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-black" id="images-settings-title">
            PDF layout
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-zinc-950">
              Page size
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) =>
                  setPageSize(event.target.value as ImagePageSize)
                }
                value={pageSize}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="original">Original image size</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-950">
              Orientation
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) =>
                  setOrientation(event.target.value as ImageOrientation)
                }
                value={orientation}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-950">
              Image fit
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) => setFit(event.target.value as ImageFitMode)}
                value={fit}
              >
                <option value="fit">Fit inside page</option>
                <option value="fill">Fill page</option>
                <option value="original">Original size</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-950">
              Margin: {margin} pt
              <input
                className="mt-3 w-full accent-red-600"
                max={72}
                min={0}
                onChange={(event) => setMargin(Number(event.target.value))}
                step={6}
                type="range"
                value={margin}
              />
            </label>
          </div>
          <div className="mt-5 hidden justify-end md:flex">
            <Button
              disabled={!canConvert}
              onClick={convertImages}
              type="button"
            >
              Create PDF
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
            description={`${state.result.totalPages} images converted into one PDF.`}
            downloadLabel="Download PDF"
            onDownload={downloadResult}
            onProcessAnother={processAnother}
            title="Your image PDF is ready"
          />
        </div>
      ) : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canConvert}
        label="Create PDF"
        onClick={convertImages}
      />
    </div>
  );
}

async function hydrateImageDetails(files: readonly LocalUploadedFile[]) {
  const entries = await Promise.all(
    files.map(async (file) => {
      try {
        return [file.id, await getImageDetails(file)] as const;
      } catch {
        return [
          file.id,
          { height: 1, mimeType: file.file.type, width: 1 },
        ] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}

async function getImageDetails(file: LocalUploadedFile) {
  if ("createImageBitmap" in globalThis) {
    try {
      const bitmap = await createImageBitmap(file.file);
      const details = {
        height: bitmap.height,
        mimeType: file.file.type,
        width: bitmap.width,
      };
      bitmap.close();
      return details;
    } catch {
      return getImageElementDetails(file);
    }
  }

  return getImageElementDetails(file);
}

function getImageElementDetails(file: LocalUploadedFile) {
  return new Promise<ImageDetails>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        height: image.naturalHeight,
        mimeType: file.file.type,
        width: image.naturalWidth,
      });
    };
    image.onerror = () => reject(new Error("This image could not be read."));
    image.src = file.previewUrl;
  });
}
