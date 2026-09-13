"use client";

import { useCallback, useMemo, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { ProcessingCard } from "@/components/tools/processing-card";
import { Button } from "@/components/ui/button";
import type { ToolDefinition } from "@/config/tools";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";
import { formatFileSize } from "@/lib/files/format-file-size";

const largeFileWarningBytes = 75 * 1024 * 1024;
const lowMemoryWarningBytes = 25 * 1024 * 1024;

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
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
  const canPrepare =
    files.length > 0 && processor.state.status !== "processing";
  const actionLabel = getActionLabel(tool);

  function startLocalPreparation() {
    void processor.start(files);
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={tool.acceptedFileTypes}
        multiple={tool.acceptsMultiple}
        onFilesChange={handleFilesChange}
      />
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
      {processor.state.status !== "idle" ? (
        <div className="mt-8">
          <ProcessingCard
            onCancel={processor.cancel}
            onReset={processor.reset}
            state={processor.state}
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
    return "Prepare PDFs";
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
