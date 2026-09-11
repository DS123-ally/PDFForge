import { CheckCircle2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";

type DownloadResultCardProps = {
  title?: string;
  description?: string;
};

export function DownloadResultCard({
  title = "Your PDF is ready",
  description = "3 files merged into one document.",
}: DownloadResultCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 aria-hidden="true" className="size-8" />
      </span>
      <h2 className="mt-6 text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-sm text-zinc-600">{description}</p>
      <Button className="mt-6 w-full" disabled type="button">
        <Download aria-hidden="true" className="size-4" />
        Download PDF
      </Button>
      <Button
        className="mt-3 w-full"
        disabled
        type="button"
        variant="secondary"
      >
        Process another
      </Button>
      <p className="my-6 text-xs leading-5 text-zinc-500">
        Temporary file data clears automatically when processing finishes or you
        close this tab.
      </p>
      <PrivacyNotice />
    </section>
  );
}
