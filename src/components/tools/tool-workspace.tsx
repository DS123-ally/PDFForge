import { Plus } from "lucide-react";

import { FileListItem } from "@/components/pdf/file-list-item";
import { FileUploader } from "@/components/pdf/file-uploader";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import type { ToolDefinition } from "@/config/tools";

const sampleFiles = [
  { name: "Quarterly-report.pdf", size: "2.4 MB" },
  { name: "Appendix-charts.pdf", size: "860 KB" },
  { name: "Signed-approval.pdf", size: "1.1 MB" },
];

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  const isMerge = tool.slug === "merge-pdf";

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader multiple={tool.acceptsMultiple} />
      {isMerge ? (
        <section className="mt-7" aria-labelledby="file-list-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-wide text-red-600 uppercase">
                Static interface preview
              </p>
              <h2 id="file-list-title" className="mt-1 text-xl font-bold">
                3 files ready
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              Drag or use buttons to reorder
            </span>
          </div>
          <ul className="space-y-3">
            {sampleFiles.map((file) => (
              <FileListItem key={file.name} {...file} />
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-4">
            <Button disabled type="button" variant="secondary">
              <Plus aria-hidden="true" className="size-4" />
              Add more files
            </Button>
            <Button disabled type="button">
              Merge PDFs
            </Button>
          </div>
          <div className="mt-7 rounded-xl bg-zinc-50 p-4">
            <ProgressIndicator label="Preparing your PDFs…" value={68} />
          </div>
        </section>
      ) : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar label={isMerge ? "Merge PDFs" : `Start ${tool.title}`} />
    </div>
  );
}
