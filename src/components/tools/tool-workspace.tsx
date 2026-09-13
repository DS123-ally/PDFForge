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
import type { ToolDefinition } from "@/config/tools";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";
import { formatFileSize } from "@/lib/files/format-file-size";

const largeFileWarningBytes = 75 * 1024 * 1024;
const lowMemoryWarningBytes = 25 * 1024 * 1024;

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const processor = usePdfWorkerProcessor();
  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
  }, []);
  const previewFile = useMemo(() => {
    if (!tool.acceptedFileTypes.includes("pdf")) {
      return null;
    }

    return (
      files.find((selectedFile) => isPdfFile(selectedFile.file))?.file ?? null
    );
  }, [files, tool.acceptedFileTypes]);
  const totalSelectedBytes = useMemo(
    () =>
      files.reduce((total, selectedFile) => total + selectedFile.file.size, 0),
    [files],
  );
  const hasLowMemoryWarning = useMemo(
    () => shouldShowLowMemoryWarning(totalSelectedBytes),
    [totalSelectedBytes],
  );
  const isMergeTool = tool.slug === "merge-pdf";
  const canPrepare =
    files.length >= (isMergeTool ? 2 : 1) &&
    processor.state.status !== "processing";
  const actionLabel = getActionLabel(tool);

  function startLocalPreparation() {
    void processor.start(files, isMergeTool ? "merge" : "prepare");
  }

  function downloadMergedPdf() {
    if (!processor.state.result?.outputBytes) {
      return;
    }

    createDownload(processor.state.result.outputBytes, {
      filename:
        processor.state.result.filename ??
        createOutputName(files[0]?.file.name ?? "merged.pdf", {
          suffix: "merged",
        }),
    });
  }

  function processAnotherGroup() {
    processor.reset();
    setClearSignal((currentSignal) => currentSignal + 1);
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={tool.acceptedFileTypes}
        allowReorder={isMergeTool}
        clearSignal={clearSignal}
        multiple={tool.acceptsMultiple}
        onFilesChange={handleFilesChange}
      />
      {isMergeTool && files.length === 1 ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
          Add at least one more PDF to merge documents.
        </p>
      ) : null}
      {totalSelectedBytes >= largeFileWarningBytes ? (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
          role="status"
        >
          Large selection: {formatFileSize(totalSelectedBytes)}. Keep this tab
          open while PDFForge prepares files locally.
        </p>
      ) : null}
      {hasLowMemoryWarning ? (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
          role="status"
        >
          This device may have limited memory. Close other heavy tabs before
          preparing {formatFileSize(totalSelectedBytes)} of PDF files.
        </p>
      ) : null}
      <div className="mt-5 hidden justify-end md:flex">
        <Button
          disabled={!canPrepare}
          onClick={startLocalPreparation}
          type="button"
        >
          {actionLabel}
        </Button>
      </div>
      {processor.state.status !== "idle" &&
      processor.state.status !== "success" ? (
        <div className="mt-8">
          <ProcessingCard
            onCancel={processor.cancel}
            onReset={processor.reset}
            state={processor.state}
          />
        </div>
      ) : null}
      {processor.state.status === "success" &&
      processor.state.result?.outputBytes ? (
        <div className="mt-8">
          <DownloadResultCard
            description={`${processor.state.result.fileCount} files merged into ${processor.state.result.totalPages} pages.`}
            downloadLabel="Download merged PDF"
            onDownload={downloadMergedPdf}
            onProcessAnother={processAnotherGroup}
            title="Your merged PDF is ready"
          />
        </div>
      ) : null}
      {previewFile ? <PdfViewer file={previewFile} /> : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canPrepare}
        label={actionLabel}
        onClick={startLocalPreparation}
      />
    </div>
  );
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function getActionLabel(tool: ToolDefinition) {
  if (tool.slug === "merge-pdf") {
    return "Merge PDFs";
  }

  return `Prepare ${tool.title}`;
}

function shouldShowLowMemoryWarning(totalSelectedBytes: number) {
  if (totalSelectedBytes < lowMemoryWarningBytes) {
    return false;
  }

  if (typeof navigator === "undefined" || !("deviceMemory" in navigator)) {
    return false;
  }

  return (
    Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) <=
    4
  );
}
