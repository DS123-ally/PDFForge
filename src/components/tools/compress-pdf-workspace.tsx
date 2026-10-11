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
import { formatFileSize } from "@/lib/files/format-file-size";
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";
import {
  CompressPdfError,
  compressFidelity,
  picturePdf,
  picturePresets,
  rewritePdf,
  type CompressMode,
  type PicturePresetId,
} from "@/lib/pdf/compress-pdf";

const modes: CompressMode[] = ["rewrite", "pictures"];
const presets: PicturePresetId[] = ["smaller", "balanced", "clearer"];

export function CompressPdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [mode, setMode] = useState<CompressMode>("rewrite");
  const [preset, setPreset] = useState<PicturePresetId>("balanced");
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<{
    bytes: Uint8Array;
    filename: string;
    keptOriginal: boolean;
    originalBytes: number;
    outputBytes: number;
    warnings: string[];
  } | null>(null);
  const selectedFile = files[0];
  const canCompress = Boolean(selectedFile) && status !== "processing";
  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setOutput(null);
    setStatus("idle");
    setMessage("Ready");
  }, []);

  async function compress() {
    if (!selectedFile) {
      return;
    }

    setStatus("processing");
    setMessage(
      mode === "rewrite"
        ? "Rewriting the PDF in this tab"
        : "Redrawing pages in this tab",
    );
    setOutput(null);

    try {
      const bytes = new Uint8Array(await selectedFile.file.arrayBuffer());
      const result =
        mode === "rewrite"
          ? await rewritePdf(bytes)
          : await picturePdf(bytes, preset);
      setOutput({
        bytes: result.bytes,
        filename: createOutputName(selectedFile.file.name, {
          extension: ".pdf",
          suffix: "compressed",
        }),
        keptOriginal: result.keptOriginal,
        originalBytes: result.originalBytes,
        outputBytes: result.outputBytes,
        warnings: result.warnings,
      });
      setStatus("success");
      setMessage("PDF ready");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof CompressPdfError
          ? error.message
          : "This PDF could not be compressed.",
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
        acceptedTypes={["pdf"]}
        clearSignal={clearSignal}
        onFilesChange={handleFilesChange}
      />
      <fieldset className="mt-5">
        <legend className="text-xs font-bold tracking-wide text-amber-800 uppercase">
          Fidelity
        </legend>
        <div className="mt-3 grid gap-3">
          {modes.map((entry) => {
            const fidelity = compressFidelity[entry];
            const selected = mode === entry;

            return (
              <label
                className={
                  selected
                    ? "rounded-2xl border border-red-600 bg-amber-50 p-4"
                    : "rounded-2xl border border-zinc-200 bg-white p-4"
                }
                key={entry}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  name="compress-mode"
                  onChange={() => {
                    setMode(entry);
                    setOutput(null);
                    setStatus("idle");
                  }}
                  type="radio"
                  value={entry}
                />
                <h2 className="text-lg font-black text-zinc-950">
                  {fidelity.label}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  {fidelity.detail}
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>
      {mode === "pictures" ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-bold text-zinc-950">
            Picture size
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((entry) => (
              <label
                className={
                  preset === entry
                    ? "min-h-11 cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
                    : "min-h-11 cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-bold"
                }
                key={entry}
              >
                <input
                  checked={preset === entry}
                  className="sr-only"
                  name="picture-size"
                  onChange={() => setPreset(entry)}
                  type="radio"
                  value={entry}
                />
                {picturePresets[entry].label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {status === "processing" ? (
        <ProgressIndicator className="mt-5" label={message} />
      ) : null}
      {status === "error" ? (
        <div className="mt-5">
          <ErrorState description={message} title="Compression failed" />
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
          disabled={!canCompress}
          onClick={() => void compress()}
          type="button"
        >
          Compress PDF
        </Button>
      </div>
      <div className="mt-4">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canCompress}
        label="Compress PDF"
        onClick={() => void compress()}
      />
    </div>
  );
}

function describeOutput(output: {
  keptOriginal: boolean;
  originalBytes: number;
  outputBytes: number;
}) {
  const sizes = `${formatFileSize(output.originalBytes)} to ${formatFileSize(output.outputBytes)}.`;

  if (output.keptOriginal) {
    return `${sizes} The new copy was not smaller, so this download is your original file.`;
  }

  return sizes;
}
