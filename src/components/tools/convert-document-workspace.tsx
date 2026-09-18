"use client";

import { useCallback, useMemo, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import {
  convertPdfDocument,
  convertTargetMeta,
  type ConvertTarget,
} from "@/lib/convert/convert-pdf";
import { createDownload } from "@/lib/files/create-download";
import {
  createEveryPageRanges,
  getPageNumbersFromRanges,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";

const toolTargets: Record<string, ConvertTarget> = {
  "pdf-to-excel": "xlsx",
  "pdf-to-html": "html",
  "pdf-to-ppt": "pptx",
  "pdf-to-word": "docx",
};

const downloadLabels: Record<ConvertTarget, string> = {
  docx: "Download Word file",
  html: "Download HTML",
  pptx: "Download PowerPoint file",
  xlsx: "Download Excel file",
};

export function ConvertDocumentWorkspace({ slug }: { slug: string }) {
  const target = toolTargets[slug] ?? "docx";
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [ranges, setRanges] = useState("");
  const [includePageImages, setIncludePageImages] = useState(target === "pptx");
  const [ocrEmptyPages, setOcrEmptyPages] = useState(true);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: Uint8Array;
    filename: string;
    pageCount: number;
  } | null>(null);
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
  const canConvert =
    Boolean(selectedFile) &&
    selectedPages.length > 0 &&
    status !== "processing";
  const showImageOption = target !== "xlsx";

  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setOutput(null);
    setStatus("idle");
    setMessage("Ready");
  }, []);

  async function convertDocument() {
    if (!selectedFile || selectedPages.length === 0) {
      return;
    }

    setStatus("processing");
    setMessage("Converting locally in this tab");
    setOutput(null);

    try {
      const result = await convertPdfDocument(selectedFile.file, {
        includePageImages: showImageOption && includePageImages,
        ocrEmptyPages,
        pages: selectedPages,
        target,
      });
      setOutput(result);
      setStatus("success");
      setMessage(`${result.pageCount} pages converted locally.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "PDFForge could not convert this PDF.",
      );
    }
  }

  function processAnother() {
    setOutput(null);
    setStatus("idle");
    setMessage("Ready");
    setRanges("");
    setClearSignal((signal) => signal + 1);
  }

  if (status === "success" && output) {
    return (
      <DownloadResultCard
        description={`${output.pageCount} pages converted locally. Empty pages used on-device OCR when that option was on.`}
        downloadLabel={downloadLabels[target]}
        onDownload={() =>
          createDownload(output.bytes, {
            filename: output.filename,
          })
        }
        onProcessAnother={processAnother}
        title="Your file is ready"
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

      {selectedFile ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Conversion settings</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Conversion stays in this tab. Selectable text is used first. Pages
            with no text layer run on-device English OCR unless you turn it off.
            Optional page pictures keep a visual copy of each page.
          </p>

          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Choose pages to convert</legend>
            <label className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
              <input
                checked={selectionMode === "all"}
                className="size-4 accent-red-600"
                name={`${slug}-page-selection`}
                onChange={() => setSelectionMode("all")}
                type="radio"
              />
              All pages
            </label>
            <label className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
              <input
                checked={selectionMode === "custom"}
                className="size-4 accent-red-600"
                name={`${slug}-page-selection`}
                onChange={() => setSelectionMode("custom")}
                type="radio"
              />
              Custom pages
            </label>
          </fieldset>

          {selectionMode === "custom" ? (
            <label className="mt-5 block" htmlFor={`${slug}-page-ranges`}>
              <span className="text-sm font-bold text-zinc-950">
                Page ranges
              </span>
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                id={`${slug}-page-ranges`}
                onChange={(event) => setRanges(event.target.value)}
                placeholder="Example: 1-3, 5"
                type="text"
                value={ranges}
              />
            </label>
          ) : null}

          {showImageOption ? (
            <label className="mt-5 flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
              <input
                checked={includePageImages}
                className="size-4 accent-red-600"
                onChange={(event) => setIncludePageImages(event.target.checked)}
                type="checkbox"
              />
              Include page pictures
            </label>
          ) : null}

          <label className="mt-3 flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
            <input
              checked={ocrEmptyPages}
              className="size-4 accent-red-600"
              onChange={(event) => setOcrEmptyPages(event.target.checked)}
              type="checkbox"
            />
            OCR pages with no selectable text
          </label>

          <p className="mt-4 text-sm font-semibold text-zinc-700" role="status">
            {selectedPages.length || 0}{" "}
            {selectedPages.length === 1 ? "page" : "pages"} selected ·{" "}
            {convertTargetMeta[target].extension.slice(1).toUpperCase()}
          </p>

          <div className="mt-5 hidden justify-end md:flex">
            <Button
              disabled={!canConvert}
              onClick={() => void convertDocument()}
              type="button"
            >
              Convert locally
            </Button>
          </div>
        </section>
      ) : null}

      {status === "processing" ? (
        <section
          aria-live="polite"
          className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm"
        >
          <h2 className="text-2xl font-bold">Converting locally</h2>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
          <ProgressIndicator className="mt-6 text-left" label={message} />
        </section>
      ) : null}

      {status === "error" ? (
        <div className="mt-8">
          <ErrorState description={message} title="Conversion failed" />
        </div>
      ) : null}

      {selectedFile?.file ? <PdfViewer file={selectedFile.file} /> : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canConvert}
        label="Convert locally"
        onClick={() => void convertDocument()}
      />
    </div>
  );
}
