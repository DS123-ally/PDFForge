import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";

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
      className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10"
    >
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600">
        {isSuccess ? (
          <CheckCircle2
            aria-hidden="true"
            className="size-8 text-emerald-700"
          />
        ) : isError ? (
          <CircleAlert aria-hidden="true" className="size-8 text-red-700" />
        ) : (
          <LoaderCircle
            aria-hidden="true"
            className={isProcessing ? "size-8 animate-spin" : "size-8"}
          />
        )}
      </span>
      <h2 className="mt-6 text-2xl font-bold">
        {isSuccess
          ? "Files are ready"
          : isError
            ? "Processing stopped"
            : "Preparing files locally"}
      </h2>
      <p className="mt-3 text-sm text-zinc-600">{state.message}</p>
      {state.status === "processing" ? (
        <ProgressIndicator
          className="my-6 text-left"
          label={state.message}
          value={state.progress}
        />
      ) : null}
      {state.result ? (
        <dl className="my-6 grid gap-3 rounded-xl bg-zinc-50 p-4 text-left text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Files</dt>
            <dd className="mt-1 font-bold">{state.result.fileCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Pages</dt>
            <dd className="mt-1 font-bold">{state.result.totalPages}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Memory</dt>
            <dd className="mt-1 font-bold">
              {formatFileSize(state.result.totalBytes)}
            </dd>
          </div>
        </dl>
      ) : null}
      <div className="my-6 flex flex-wrap justify-center gap-3">
        {isProcessing ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
        ) : null}
        {state.status === "success" ||
        state.status === "error" ||
        state.status === "cancelled" ? (
          <Button onClick={onReset} type="button" variant="secondary">
            Reset status
          </Button>
        ) : null}
      </div>
      <PrivacyNotice />
    </section>
  );
}
