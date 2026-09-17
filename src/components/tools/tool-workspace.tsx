"use client";

import { useCallback, useMemo, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { EditPrivacyWorkspace } from "@/components/tools/edit-privacy-workspace";
import { ImagesToPdfWorkspace } from "@/components/tools/images-to-pdf-workspace";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { OrganizePdfWorkspace } from "@/components/tools/organize-pdf-workspace";
import { PdfToImagesWorkspace } from "@/components/tools/pdf-to-images-workspace";
import { PrivacyInspectorWorkspace } from "@/components/tools/privacy-inspector-workspace";
import { RecipeWorkspace } from "@/components/tools/recipe-workspace";
import { ProcessingCard } from "@/components/tools/processing-card";
import { RedactPdfWorkspace } from "@/components/tools/redact-pdf-workspace";
import { SecurityWorkspace } from "@/components/tools/security-workspace";
import { SplitPdfWorkspace } from "@/components/tools/split-pdf-workspace";
import { Button } from "@/components/ui/button";
import type { ToolDefinition } from "@/config/tools";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  if (tool.slug === "split-pdf") {
    return <SplitPdfWorkspace />;
  }

  if (tool.slug === "organize-pdf") {
    return <OrganizePdfWorkspace />;
  }

  if (tool.slug === "images-to-pdf") {
    return <ImagesToPdfWorkspace />;
  }

  if (tool.slug === "pdf-to-images") {
    return <PdfToImagesWorkspace />;
  }

  if (tool.slug === "privacy-inspector") {
    return <PrivacyInspectorWorkspace />;
  }

  if (tool.slug === "private-recipes") {
    return <RecipeWorkspace />;
  }

  if (isPhaseNineTool(tool.slug)) {
    return <EditPrivacyWorkspace tool={tool} />;
  }

  if (isPhaseTenSecurityTool(tool.slug)) {
    return <SecurityWorkspace tool={tool} />;
  }

  if (tool.slug === "redact-pdf") {
    return <RedactPdfWorkspace />;
  }

  return <GenericToolWorkspace tool={tool} />;
}

function isPhaseNineTool(slug: string) {
  return [
    "rotate-pdf",
    "add-watermark",
    "add-page-numbers",
    "add-headers-footers",
    "remove-metadata",
    "view-metadata",
    "extract-text",
  ].includes(slug);
}

function isPhaseTenSecurityTool(slug: string) {
  return ["password-protect-pdf", "unlock-pdf", "flatten-pdf"].includes(slug);
}

function GenericToolWorkspace({ tool }: { tool: ToolDefinition }) {
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
