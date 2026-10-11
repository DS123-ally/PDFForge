"use client";

import { useCallback, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import {
  convertSourceToPdf,
  sourceFidelity,
  sourceKindForTool,
} from "@/lib/convert/source-to-pdf";
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";
import { SourceDocumentError } from "@/lib/convert/read-source";

export function SourceToPdfWorkspace({ slug }: { slug: string }) {
  const kind = sourceKindForTool(slug) ?? "docx";
  const fidelity = sourceFidelity[kind];
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: Uint8Array;
    filename: string;
    pageCount: number;
    replacedCharacters: number;
    warnings: string[];
  } | null>(null);
  const selectedFile = files[0];
  const canConvert = Boolean(selectedFile) && status !== "processing";
  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setOutput(null);
    setStatus("idle");
    setMessage("Ready");
  }, []);

  async function createPdf() {
    if (!selectedFile) {
      return;
    }

    setStatus("processing");
    setMessage("Reading the file in this tab");
    setOutput(null);

    try {
      const bytes = new Uint8Array(await selectedFile.file.arrayBuffer());
      const result = await convertSourceToPdf(bytes, kind);
      setOutput({
        bytes: result.bytes,
        filename: createOutputName(selectedFile.file.name, {
          extension: ".pdf",
          suffix: "pdf",
        }),
        pageCount: result.pageCount,
        replacedCharacters: result.replacedCharacters,
        warnings: result.warnings,
      });
      setStatus("success");
      setMessage("PDF ready");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof SourceDocumentError
          ? error.message
          : "This file could not be converted.",
      );
    }
  }

  function downloadPdf() {
    if (!output) {
      return;
    }

    createDownload(output.bytes, { filename: output.filename });
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={[kind]}
        clearSignal={clearSignal}
        onFilesChange={handleFilesChange}
      />
      <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold tracking-wide text-amber-800 uppercase">
          Fidelity
        </p>
        <h2 className="mt-1 text-lg font-black text-zinc-950">
          {fidelity.label}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          {fidelity.detail}
        </p>
      </section>
      {status === "processing" ? (
        <ProgressIndicator className="mt-5" label={message} />
      ) : null}
      {status === "error" ? (
        <div className="mt-5">
          <ErrorState description={message} title="Conversion failed" />
        </div>
      ) : null}
      {output ? (
        <div className="mt-5">
          <DownloadResultCard
            description={describeOutput(output)}
            downloadLabel="Download PDF"
            onDownload={downloadPdf}
            onProcessAnother={() => {
              setOutput(null);
              setStatus("idle");
              setClearSignal((current) => current + 1);
            }}
            title="Your PDF is ready"
          />
          {output.warnings.length > 0 ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-700">
              {output.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="mt-5 hidden justify-end md:flex">
        <Button
          disabled={!canConvert}
          onClick={() => void createPdf()}
          type="button"
        >
          Create PDF
        </Button>
      </div>
      <div className="mt-4">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canConvert}
        label="Create PDF"
        onClick={() => void createPdf()}
      />
    </div>
  );
}

function describeOutput(output: {
  pageCount: number;
  replacedCharacters: number;
}) {
  const pages = `${output.pageCount} page${output.pageCount === 1 ? "" : "s"}.`;

  if (output.replacedCharacters === 0) {
    return pages;
  }

  return `${pages} ${output.replacedCharacters} character${output.replacedCharacters === 1 ? "" : "s"} ${output.replacedCharacters === 1 ? "was" : "were"} replaced with ? because the PDF font has no glyph for them.`;
}
