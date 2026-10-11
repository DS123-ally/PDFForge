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
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";
import {
  recoverPicturePdf,
  rebuildPdf,
  RepairPdfError,
  repairFidelity,
  type RepairMode,
  type RepairResult,
} from "@/lib/pdf/repair-pdf";

const modes: RepairMode[] = ["rebuild", "pictures"];

export function RepairPdfWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [mode, setMode] = useState<RepairMode>("rebuild");
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("Ready");
  const [output, setOutput] = useState<
    (RepairResult & { filename: string }) | null
  >(null);
  const selectedFile = files[0];
  const canRepair = Boolean(selectedFile) && status !== "processing";
  const handleFilesChange = useCallback((nextFiles: LocalUploadedFile[]) => {
    setFiles(nextFiles);
    setOutput(null);
    setStatus("idle");
    setMessage("Ready");
  }, []);

  async function repair() {
    if (!selectedFile) {
      return;
    }

    setStatus("processing");
    setMessage(
      mode === "rebuild"
        ? "Rebuilding pages in this tab"
        : "Redrawing pages in this tab",
    );
    setOutput(null);

    try {
      const bytes = new Uint8Array(await selectedFile.file.arrayBuffer());
      const result =
        mode === "rebuild"
          ? await rebuildPdf(bytes)
          : await recoverPicturePdf(bytes);
      setOutput({
        ...result,
        filename: createOutputName(selectedFile.file.name, {
          extension: ".pdf",
          suffix: "repaired",
        }),
      });
      setStatus("success");
      setMessage("PDF ready");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof RepairPdfError
          ? error.message
          : "This PDF could not be repaired.",
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
            const fidelity = repairFidelity[entry];
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
                  name="repair-mode"
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
      {status === "processing" ? (
        <ProgressIndicator className="mt-5" label={message} />
      ) : null}
      {status === "error" ? (
        <div className="mt-5">
          <ErrorState description={message} title="Repair failed" />
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
          disabled={!canRepair}
          onClick={() => void repair()}
          type="button"
        >
          Repair PDF
        </Button>
      </div>
      <div className="mt-4">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canRepair}
        label="Repair PDF"
        onClick={() => void repair()}
      />
    </div>
  );
}

function describeOutput(output: RepairResult) {
  if (output.mode === "pictures") {
    return `Recovered ${output.pageCount} of ${output.sourcePageCount} pages as pictures.`;
  }

  return `Rebuilt ${output.pageCount} of ${output.sourcePageCount} pages into a new PDF.`;
}
