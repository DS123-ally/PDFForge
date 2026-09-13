"use client";

import { useCallback, useMemo, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import type { ToolDefinition } from "@/config/tools";

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
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

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={tool.acceptedFileTypes}
        multiple={tool.acceptsMultiple}
        onFilesChange={handleFilesChange}
      />
      {previewFile ? <PdfViewer file={previewFile} /> : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        label={tool.slug === "merge-pdf" ? "Merge PDFs" : `Start ${tool.title}`}
      />
    </div>
  );
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}
