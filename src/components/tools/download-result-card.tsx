import { CheckCircle2, Download, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";

type DownloadResultCardProps = {
  children?: ReactNode;
  title?: string;
  description?: string;
  downloadLabel?: string;
  onDownload?: () => void;
  onProcessAnother?: () => void;
};

export function DownloadResultCard({
  children,
  title = "Your document is ready",
  description = "Files were processed locally in your browser RAM.",
  downloadLabel = "Download PDF",
  onDownload,
  onProcessAnother,
}: DownloadResultCardProps) {
  return (
    <section
      aria-live="polite"
      className="border-border/80 rounded-3xl border bg-white p-6 text-center shadow-lg sm:p-10"
    >
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
        <CheckCircle2 aria-hidden="true" className="size-8" />
      </div>

      <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>

      {children}

      <div className="mx-auto mt-7 max-w-sm space-y-2.5">
        <Button
          className="w-full shadow-sm"
          disabled={!onDownload}
          onClick={onDownload}
          size="lg"
          type="button"
        >
          <Download aria-hidden="true" className="size-4" />
          {downloadLabel}
        </Button>

        <Button
          className="w-full text-xs"
          disabled={!onProcessAnother}
          onClick={onProcessAnother}
          size="sm"
          type="button"
          variant="secondary"
        >
          <RefreshCw aria-hidden="true" className="size-3" />
          Process Another File
        </Button>
      </div>

      <div className="mt-6 border-t border-zinc-100 pt-5">
        <p className="text-[11px] leading-5 text-zinc-400">
          Temporary file buffers in memory are automatically cleared when you
          leave or process another group.
        </p>
        <div className="mt-4">
          <PrivacyNotice />
        </div>
      </div>
    </section>
  );
}
