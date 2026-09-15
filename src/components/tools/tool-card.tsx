import {
  Eye,
  FileImage,
  FileStack,
  Highlighter,
  Images,
  ListRestart,
  RotateCw,
  ScanSearch,
  Scissors,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import type { ToolDefinition } from "@/config/tools";
import { getToolHref } from "@/lib/privacy/tool-location";
import { cn } from "@/lib/utils";

const icons = {
  "merge-pdf": FileStack,
  "split-pdf": Scissors,
  "organize-pdf": ListRestart,
  "images-to-pdf": Images,
  "pdf-to-images": FileImage,
  "rotate-pdf": RotateCw,
  "find-redact-pii": Highlighter,
  "privacy-inspector": ScanSearch,
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
        "group flex min-h-40 flex-col rounded-2xl border border-transparent p-5 transition hover:border-zinc-200 hover:bg-white hover:shadow-sm focus-visible:outline-2 focus-visible:outline-red-600",
        className,
      )}
      href={getToolHref(tool.slug)}
    >
      <Icon aria-hidden="true" className="size-6 text-red-600" />
      <h3 className="mt-5 font-bold group-hover:text-red-700">{tool.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        {tool.shortDescription}
      </p>
      <span className="mt-auto pt-5 text-xs font-bold text-zinc-500">
        {tool.category}
      </span>
    </Link>
  );
}
