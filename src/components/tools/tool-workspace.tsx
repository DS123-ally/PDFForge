import { FileUploader } from "@/components/pdf/file-uploader";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import type { ToolDefinition } from "@/config/tools";

export function ToolWorkspace({ tool }: { tool: ToolDefinition }) {
  return (
    <div className="pb-24 md:pb-0">
      <FileUploader multiple={tool.acceptsMultiple} />
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        label={tool.slug === "merge-pdf" ? "Merge PDFs" : `Start ${tool.title}`}
      />
    </div>
  );
}
