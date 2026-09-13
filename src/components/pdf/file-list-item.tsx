import { CircleX, GripVertical } from "lucide-react";

import { PdfThumbnail } from "@/components/pdf/pdf-thumbnail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileListItemProps = {
  name: string;
  size: string;
  error?: string;
  onRemove?: () => void;
  previewUrl?: string;
  status?: "ready" | "error";
};

export function FileListItem({
  name,
  size,
  error,
  onRemove,
  previewUrl,
  status = "ready",
}: FileListItemProps) {
  return (
    <li
      className={cn(
        "flex min-h-20 items-center gap-3 rounded-xl border bg-white px-3 py-3 sm:px-4",
        status === "error" ? "border-red-200" : "border-zinc-200",
      )}
    >
      <GripVertical
        aria-hidden="true"
        className="size-5 shrink-0 text-zinc-400"
      />
      <PdfThumbnail className="size-12" />
      <div className="min-w-0 flex-1">
        {previewUrl ? (
          <a
            className="block truncate text-sm font-bold text-zinc-950 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            href={previewUrl}
            rel="noopener"
            target="_blank"
            title={name}
          >
            {name}
          </a>
        ) : (
          <p className="truncate text-sm font-bold" title={name}>
            {name}
          </p>
        )}
        <p className="mt-1 text-xs text-zinc-500">{size}</p>
        {error ? (
          <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
        ) : null}
      </div>
      <Button
        aria-label={`Remove ${name}`}
        className="size-11 shrink-0 p-0"
        disabled={!onRemove}
        onClick={onRemove}
        type="button"
        variant="ghost"
      >
        <CircleX aria-hidden="true" className="size-5" />
      </Button>
    </li>
  );
}
