import { LoaderCircle } from "lucide-react";

import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { ProgressIndicator } from "@/components/ui/progress-indicator";

export function ProcessingCard() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600">
        <LoaderCircle aria-hidden="true" className="size-8" />
      </span>
      <h2 className="mt-6 text-2xl font-bold">Merging your PDFs</h2>
      <p className="mt-3 text-sm text-zinc-600">
        Keep this tab open. Your files are being combined on this device.
      </p>
      <ProgressIndicator
        className="my-6 text-left"
        label="Combining 2 of 3 files"
        value={68}
      />
      <PrivacyNotice />
    </section>
  );
}
