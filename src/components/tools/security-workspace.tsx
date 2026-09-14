"use client";

import { useCallback, useState } from "react";

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
import { ErrorState } from "@/components/ui/error-state";
import type { ToolDefinition } from "@/config/tools";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";
import { createDownload } from "@/lib/files/create-download";
import { minPasswordLength, pdfEncryptionMethod } from "@/lib/pdf/password-pdf";
import { rasterizeUnlockedPdf } from "@/lib/pdf/redact-pdf";
import type { PdfWorkerOperation } from "@/lib/workers/pdf-worker-types";

export function SecurityWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const selectedFile = files[0];
  const isUnlock = tool.slug === "unlock-pdf";
  const isProtect = tool.slug === "password-protect-pdf";
  const isBusy = state.status === "processing" || localBusy;
  const passwordsMatch = !isProtect || password === confirmPassword;
  const canRun =
    Boolean(selectedFile && !isBusy) &&
    (!(isProtect || isUnlock) || password.length >= minPasswordLength) &&
    passwordsMatch;

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      setPassword("");
      setConfirmPassword("");
      setLocalError(null);
      reset();
    },
    [reset],
  );

  async function runTool() {
    if (!selectedFile) {
      return;
    }

    setLocalError(null);

    if (isProtect && password !== confirmPassword) {
      setLocalError("The password confirmation does not match.");
      return;
    }

    const operation: PdfWorkerOperation = isProtect
      ? "protect-pdf"
      : isUnlock
        ? "unlock-pdf"
        : "flatten-pdf";

    await start(
      [selectedFile],
      operation,
      isProtect || isUnlock ? { passwordPdf: { password } } : undefined,
    );
  }

  async function rebuildUnlockedCopy() {
    if (!selectedFile) {
      return;
    }

    setLocalBusy(true);
    setLocalError(null);

    try {
      const result = await rasterizeUnlockedPdf(
        selectedFile.file,
        password,
        selectedFile.file.name,
      );
      createDownload(
        new Blob([result.outputBytes], { type: "application/pdf" }),
        { filename: result.filename },
      );
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setLocalError(
        error instanceof Error &&
          error.message.toLowerCase().includes("password")
          ? "That password does not open this PDF. It is not stored or logged."
          : "PDFForge could not rebuild an unlocked copy from this file.",
      );
    } finally {
      setLocalBusy(false);
    }
  }

  function downloadResult() {
    if (!state.result?.outputBytes) {
      return;
    }

    createDownload(
      new Blob([state.result.outputBytes], { type: "application/pdf" }),
      { filename: state.result.filename },
    );
    setPassword("");
    setConfirmPassword("");
  }

  function processAnother() {
    reset();
    setPassword("");
    setConfirmPassword("");
    setLocalError(null);
    setClearSignal((signal) => signal + 1);
  }

  const showRasterFallback =
    isUnlock && state.error?.code === "unsupported_encryption";

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={["pdf"]}
        allowPasswordProtected={isUnlock}
        clearSignal={clearSignal}
        multiple={false}
        onFilesChange={handleFilesChange}
      />

      {selectedFile ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Security settings</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {getHelpText(tool.slug)}
          </p>
          {isProtect || isUnlock ? (
            <div className="mt-4 grid gap-4">
              <PasswordField
                autoComplete={isProtect ? "new-password" : "current-password"}
                id="security-password"
                label={isProtect ? "Open password" : "PDF password"}
                onChange={setPassword}
                value={password}
              />
              {isProtect ? (
                <PasswordField
                  autoComplete="new-password"
                  id="security-password-confirm"
                  label="Confirm password"
                  onChange={setConfirmPassword}
                  value={confirmPassword}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 hidden justify-end md:flex">
            <Button
              disabled={!canRun}
              onClick={() => void runTool()}
              type="button"
            >
              {getActionLabel(tool.slug)}
            </Button>
          </div>
        </section>
      ) : null}

      {state.status !== "idle" && state.status !== "success" ? (
        <div className="mt-8">
          <ProcessingCard onCancel={cancel} onReset={reset} state={state} />
        </div>
      ) : null}

      {showRasterFallback ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">
            Structural unlock is not available for this encryption. You can
            rebuild an unlocked image-based copy. Selectable text will not be
            preserved.
          </p>
          <Button
            className="mt-4"
            disabled={!password || localBusy}
            onClick={() => void rebuildUnlockedCopy()}
            type="button"
          >
            Rebuild unlocked copy
          </Button>
        </div>
      ) : null}

      {localError ? (
        <div className="mt-8">
          <ErrorState description={localError} title="Security tool failed" />
        </div>
      ) : null}

      {state.status === "success" && state.result?.outputBytes ? (
        <div className="mt-8">
          <DownloadResultCard
            description={`${state.result.totalPages} pages processed locally.`}
            downloadLabel="Download PDF"
            onDownload={downloadResult}
            onProcessAnother={processAnother}
            title="Your PDF is ready"
          />
        </div>
      ) : null}

      {selectedFile && !selectedFile.isPasswordProtected ? (
        <PdfViewer file={selectedFile.file} />
      ) : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canRun}
        label={getActionLabel(tool.slug)}
        onClick={() => void runTool()}
      />
    </div>
  );
}

function PasswordField({
  autoComplete,
  id,
  label,
  onChange,
  value,
}: {
  autoComplete: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-zinc-950" htmlFor={id}>
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
        id={id}
        minLength={minPasswordLength}
        onChange={(event) => onChange(event.target.value)}
        type="password"
        value={value}
      />
    </label>
  );
}

function getActionLabel(slug: string) {
  switch (slug) {
    case "password-protect-pdf":
      return "Protect PDF";
    case "unlock-pdf":
      return "Unlock PDF";
    case "flatten-pdf":
      return "Flatten PDF";
    default:
      return "Process PDF";
  }
}

function getHelpText(slug: string) {
  switch (slug) {
    case "password-protect-pdf":
      return `PDFForge encrypts with ${pdfEncryptionMethod}. The password stays in this tab only and is cleared after download.`;
    case "unlock-pdf":
      return "Enter the existing password. PDFForge does not store, log, or recover forgotten passwords.";
    case "flatten-pdf":
      return "AcroForm fields are burned into page content. Markup annotations may remain unless you redact or rasterize those pages.";
    default:
      return "This security operation runs locally in your browser.";
  }
}
