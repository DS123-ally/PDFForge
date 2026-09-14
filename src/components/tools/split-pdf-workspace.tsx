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
import { ProcessingCard } from "@/components/tools/processing-card";
import { Button } from "@/components/ui/button";
import { createDownload } from "@/lib/files/create-download";
import { formatFileSize } from "@/lib/files/format-file-size";
import type { SplitPdfMode } from "@/lib/pdf/split-pdf";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";

const largeFileWarningBytes = 75 * 1024 * 1024;

const splitModes: Array<{
  description: string;
  id: SplitPdfMode;
  label: string;
  needsRanges: boolean;
}> = [
  {
    description: "Save selected pages into one new PDF.",
    id: "extract",
    label: "Extract selected pages",
    needsRanges: true,
  },
  {
    description: "Create one PDF per range and download them as a ZIP.",
    id: "ranges",
    label: "Split by ranges",
    needsRanges: true,
  },
  {
    description: "Create one PDF for every page and download them as a ZIP.",
    id: "every-page",
    label: "Split every page",
    needsRanges: false,
  },
];

export function SplitPdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [mode, setMode] = useState<SplitPdfMode>("extract");
  const [ranges, setRanges] = useState("");
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const selectedFile = files[0];
  const selectedMode = splitModes.find((splitMode) => splitMode.id === mode);
  const canSplit = Boolean(
    selectedFile &&
    state.status !== "processing" &&
    (!selectedMode?.needsRanges || ranges.trim()),
  );
  const resultDescription = useMemo(() => {
    const result = state.result;

    if (!result) {
      return "";
    }

    if (result.outputMimeType === "application/zip") {
      return `${result.fileCount} PDFs created from ${result.totalPages} pages.`;
    }

    return `${result.totalPages} selected pages extracted into one PDF.`;
  }, [state.result]);

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      reset();
    },
    [reset],
  );

  function splitPdf() {
    if (!selectedFile) {
      return;
    }

    void start([selectedFile], "split", {
      split: {
        mode,
        ranges: selectedMode?.needsRanges ? ranges : undefined,
      },
    });
  }

  function downloadResult() {
    const result = state.result;

    if (!result?.outputBytes) {
      return;
    }

    createDownload(
      new Blob([result.outputBytes], {
        type: result.outputMimeType ?? "application/pdf",
      }),
      {
        filename: result.filename,
      },
    );
  }

  function processAnother() {
    reset();
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

      {selectedFile?.file.size &&
      selectedFile.file.size >= largeFileWarningBytes ? (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
          role="status"
        >
          Large file: {formatFileSize(selectedFile.file.size)}. Splitting
          creates extra output bytes in memory, so keep this tab focused until
          it finishes.
        </p>
      ) : null}

      {selectedFile ? (
        <section
          aria-labelledby="split-settings-title"
          className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-black" id="split-settings-title">
            Split settings
          </h2>
          <fieldset className="mt-4 grid gap-3">
            <legend className="sr-only">Choose split mode</legend>
            {splitModes.map((splitMode) => (
              <label
                className="flex min-h-14 cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-red-600"
                key={splitMode.id}
              >
                <input
                  checked={mode === splitMode.id}
                  className="mt-1 size-4 accent-red-600"
                  name="split-mode"
                  onChange={() => setMode(splitMode.id)}
                  type="radio"
                />
                <span>
                  <span className="block text-sm font-bold text-zinc-950">
                    {splitMode.label}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-zinc-600">
                    {splitMode.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {selectedMode?.needsRanges ? (
            <label className="mt-5 block" htmlFor="split-ranges">
              <span className="text-sm font-bold text-zinc-950">
                Page ranges
              </span>
              <input
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                id="split-ranges"
                onChange={(event) => setRanges(event.target.value)}
                placeholder="Example: 1-3, 5, 8-10"
                type="text"
                value={ranges}
              />
              <span className="mt-2 block text-xs leading-5 text-zinc-500">
                Ranges must not overlap and must stay within the page count.
              </span>
            </label>
          ) : null}

          <div className="mt-5 hidden justify-end md:flex">
            <Button disabled={!canSplit} onClick={splitPdf} type="button">
              Split PDF
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
            downloadLabel={
              state.result.outputMimeType === "application/zip"
                ? "Download ZIP"
                : "Download split PDF"
            }
            onDownload={downloadResult}
            onProcessAnother={processAnother}
            title="Your split output is ready"
          />
        </div>
      ) : null}

      {selectedFile ? <PdfViewer file={selectedFile.file} /> : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canSplit}
        label="Split PDF"
        onClick={splitPdf}
      />
    </div>
  );
}
