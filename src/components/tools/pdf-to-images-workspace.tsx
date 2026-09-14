"use client";

import { Download } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { createDownload } from "@/lib/files/create-download";
import {
  createImagesZip,
  pdfToImages,
  type PdfImageFormat,
  type PdfImageOutput,
} from "@/lib/pdf/pdf-to-images";
import {
  createEveryPageRanges,
  getPageNumbersFromRanges,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";

type ExportStatus = "idle" | "processing" | "success" | "error";

const highResolutionPageWarning = 20;

export function PdfToImagesWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [ranges, setRanges] = useState("");
  const [format, setFormat] = useState<PdfImageFormat>("png");
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [message, setMessage] = useState("Ready");
  const [outputs, setOutputs] = useState<PdfImageOutput[]>([]);
  const selectedFile = files[0];
  const selectedPages = useMemo(() => {
    if (!selectedFile?.pageCount) {
      return [];
    }

    if (selectionMode === "all") {
      return getPageNumbersFromRanges(
        createEveryPageRanges(selectedFile.pageCount),
      );
    }

    try {
      return getPageNumbersFromRanges(
        parsePageRanges(ranges, selectedFile.pageCount),
      );
    } catch {
      return [];
    }
  }, [ranges, selectedFile, selectionMode]);
  const showLargeExportWarning =
    selectedPages.length * scale >= highResolutionPageWarning;
  const canExport =
    Boolean(selectedFile) &&
    selectedPages.length > 0 &&
    status !== "processing";

  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setOutputs([]);
    setStatus("idle");
    setMessage("Ready");
  }, []);

  async function exportImages() {
    if (!selectedFile || selectedPages.length === 0) {
      return;
    }

    setStatus("processing");
    setMessage("Rendering pages locally");
    setOutputs([]);

    try {
      const nextOutputs = await pdfToImages(selectedFile.file, {
        format,
        pages: selectedPages,
        quality,
        scale,
        sourceName: selectedFile.file.name,
      });

      setOutputs(nextOutputs);
      setStatus("success");
      setMessage(`${nextOutputs.length} images are ready to download.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "PDFForge could not export these pages.",
      );
    }
  }

  function downloadOne(output: PdfImageOutput) {
    createDownload(output.bytes, { filename: output.filename });
  }

  async function downloadZip() {
    if (!selectedFile || outputs.length === 0) {
      return;
    }

    const zip = await createImagesZip(outputs, selectedFile.file.name);
    createDownload(zip.bytes, { filename: zip.filename });
  }

  function processAnother() {
    setOutputs([]);
    setStatus("idle");
    setMessage("Ready");
    setRanges("");
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
          aria-labelledby="pdf-image-settings-title"
          className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-black" id="pdf-image-settings-title">
            Image export settings
          </h2>

          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Choose pages to export</legend>
            <label className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
              <input
                checked={selectionMode === "all"}
                className="size-4 accent-red-600"
                name="page-selection"
                onChange={() => setSelectionMode("all")}
                type="radio"
              />
              All pages
            </label>
            <label className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
              <input
                checked={selectionMode === "custom"}
                className="size-4 accent-red-600"
                name="page-selection"
                onChange={() => setSelectionMode("custom")}
                type="radio"
              />
              Custom pages
            </label>
          </fieldset>

          {selectionMode === "custom" ? (
            <label className="mt-5 block" htmlFor="image-page-ranges">
              <span className="text-sm font-bold text-zinc-950">
                Page ranges
              </span>
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                id="image-page-ranges"
                onChange={(event) => setRanges(event.target.value)}
                placeholder="Example: 1-3, 5"
                type="text"
                value={ranges}
              />
            </label>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-bold text-zinc-950">
              Format
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) =>
                  setFormat(event.target.value as PdfImageFormat)
                }
                value={format}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-950">
              Resolution
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) => setScale(Number(event.target.value))}
                value={scale}
              >
                <option value={1}>Standard</option>
                <option value={2}>High</option>
                <option value={3}>Very high</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-950">
              JPG quality: {Math.round(quality * 100)}%
              <input
                className="mt-3 w-full accent-red-600"
                disabled={format === "png"}
                max={1}
                min={0.5}
                onChange={(event) => setQuality(Number(event.target.value))}
                step={0.05}
                type="range"
                value={quality}
              />
            </label>
          </div>

          <p className="mt-4 text-sm font-semibold text-zinc-700" role="status">
            {selectedPages.length || 0}{" "}
            {selectedPages.length === 1 ? "page" : "pages"} selected.
          </p>

          {showLargeExportWarning ? (
            <p
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              role="status"
            >
              High-resolution export can use significant memory. Export fewer
              pages or choose Standard resolution on mobile devices.
            </p>
          ) : null}

          <div className="mt-5 hidden justify-end md:flex">
            <Button disabled={!canExport} onClick={exportImages} type="button">
              Export images
            </Button>
          </div>
        </section>
      ) : null}

      {status === "processing" ? (
        <section
          aria-live="polite"
          className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm"
        >
          <h2 className="text-2xl font-bold">Rendering pages locally</h2>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
          <ProgressIndicator className="mt-6 text-left" label={message} />
        </section>
      ) : null}

      {status === "error" ? (
        <div className="mt-8">
          <ErrorState description={message} title="Export failed" />
        </div>
      ) : null}

      {status === "success" && outputs.length > 0 ? (
        <section
          aria-live="polite"
          className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-2xl font-bold">Your images are ready</h2>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={downloadZip} type="button">
              <Download aria-hidden="true" className="size-4" />
              Download all as ZIP
            </Button>
            <Button onClick={processAnother} type="button" variant="secondary">
              Process another
            </Button>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {outputs.map((output) => (
              <li
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3"
                key={output.filename}
              >
                <span className="text-sm font-bold">
                  Page {output.pageNumber}
                </span>
                <Button
                  onClick={() => downloadOne(output)}
                  type="button"
                  variant="secondary"
                >
                  Download
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <PrivacyNotice />
          </div>
        </section>
      ) : null}

      {selectedFile ? <PdfViewer file={selectedFile.file} /> : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canExport}
        label="Export images"
        onClick={exportImages}
      />
    </div>
  );
}
