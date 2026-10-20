import { CheckCircle2, CircleAlert, LoaderCircle, RotateCcw, XCircle } from "lucide-react";

import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import type { ProcessingState } from "@/lib/workers/processing-state";
import { formatFileSize } from "@/lib/files/format-file-size";

type ProcessingCardProps = {
  onCancel?: () => void;
  onReset?: () => void;
  state: ProcessingState;
};

export function ProcessingCard({
  onCancel,
  onReset,
  state,
}: ProcessingCardProps) {
  const isProcessing = state.status === "processing";
  const isSuccess = state.status === "success";
  const isError = state.status === "error";

  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-border/80 bg-white p-6 text-center shadow-lg sm:p-10"
    >
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-zinc-50 text-zinc-900 ring-1 ring-zinc-200">
        {isSuccess ? (
          <CheckCircle2
            aria-hidden="true"
            className="size-8 text-emerald-600"
          />
        ) : isError ? (
          <CircleAlert aria-hidden="true" className="size-8 text-red-600" />
        ) : (
          <LoaderCircle
            aria-hidden="true"
            className={isProcessing ? "size-8 animate-spin text-primary" : "size-8 text-zinc-400"}
          />
        )}
      </div>

      <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">
        {isSuccess
          ? state.result?.outputBytes
            ? "Processing Complete"
            : "Documents Ready"
          : isError
            ? "Processing Interrupted"
            : "Executing WebAssembly Pipeline"}
      </h2>
      <p className="mt-2 text-sm text-zinc-600">{state.message}</p>

      {state.status === "processing" ? (
        <div className="mx-auto my-6 max-w-md">
          <ProgressIndicator
            className="text-left"
            label={state.message}
            value={state.progress}
          />
        </div>
      ) : null}

      {state.result ? (
        <dl className="mx-auto my-6 grid max-w-md gap-3 rounded-2xl border border-border/70 bg-zinc-50/80 p-4 text-left text-xs sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500 font-medium">Input Files</dt>
            <dd className="mt-1 text-sm font-bold text-zinc-900">{state.result.fileCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 font-medium">Total Pages</dt>
            <dd className="mt-1 text-sm font-bold text-zinc-900">{state.result.totalPages}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 font-medium">Output Size</dt>
            <dd className="mt-1 text-sm font-bold text-zinc-900 font-mono">
              {state.result.outputBytes
                ? formatFileSize(state.result.outputBytes.byteLength)
                : "N/A"}
            </dd>
          </div>
        </dl>
      ) : null}

      {isProcessing && onCancel ? (
        <div className="mt-6">
          <Button
            className="text-xs"
            onClick={onCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            <XCircle className="size-3.5" />
            <span>Cancel Processing</span>
          </Button>
        </div>
      ) : null}

      {isError && onReset ? (
        <div className="mt-6">
          <Button
            onClick={onReset}
            size="sm"
            type="button"
            variant="secondary"
          >
            <RotateCcw className="size-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      ) : null}

      <div className="mt-8 border-t border-zinc-100 pt-5">
        <PrivacyNotice />
      </div>
    </section>
  );
}
