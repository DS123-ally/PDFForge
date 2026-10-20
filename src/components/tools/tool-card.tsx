import {
  ArrowUpRight,
  Eye,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileStack,
  FileText,
  FileType,
  Fingerprint,
  Highlighter,
  Images,
  ListRestart,
  ListTree,
  Presentation,
  Receipt,
  RotateCw,
  ScanLine,
  ScanSearch,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Shrink,
  Table,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import type { ToolDefinition } from "@/config/tools";
import { getToolHref } from "@/lib/privacy/tool-location";
import { cn } from "@/lib/utils";

const icons = {
  "merge-pdf": FileStack,
  "compress-pdf": Shrink,
  "repair-pdf": Wrench,
  "split-pdf": Scissors,
  "organize-pdf": ListRestart,
  "document-integrity": Fingerprint,
  "gst-invoice": Receipt,
  "scan-document": ScanLine,
  "images-to-pdf": Images,
  "pdf-to-images": FileImage,
  "pdf-to-word": FileType,
  "pdf-to-excel": FileSpreadsheet,
  "pdf-to-ppt": Presentation,
  "pdf-to-html": FileCode2,
  "word-to-pdf": FileType,
  "excel-to-pdf": FileSpreadsheet,
  "powerpoint-to-pdf": Presentation,
  "markdown-to-pdf": FileText,
  "csv-to-pdf": Table,
  "rotate-pdf": RotateCw,
  "find-redact-pii": Highlighter,
  "privacy-risk-scanner": ShieldAlert,
  "privacy-inspector": ScanSearch,
  "private-recipes": ListTree,
  "remove-metadata": ShieldCheck,
  "view-metadata": Eye,
} as const;

export function ToolCard({
  className,
  tool,
}: {
  className?: string;
  tool: ToolDefinition;
}) {
  const Icon = icons[tool.slug as keyof typeof icons] ?? FileStack;

  return (
    <Link
      className={cn(
        "group border-border focus-visible:outline-primary relative flex min-h-44 flex-col justify-between rounded-2xl border bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-xs focus-visible:outline-2",
        className,
      )}
      href={getToolHref(tool.slug)}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="group-hover:bg-primary grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200/80 transition-colors group-hover:text-white">
            <Icon aria-hidden="true" className="size-4" />
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600">
            {tool.category}
          </span>
        </div>

        <h3 className="group-hover:text-primary mt-4 text-sm font-bold tracking-tight text-zinc-950 transition-colors">
          {tool.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
          {tool.shortDescription}
        </p>
      </div>

      <div className="text-primary mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] font-semibold">
        <span>Launch tool</span>
        <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}
