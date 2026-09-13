import { ArrowDown, ArrowUp, CircleX, GripVertical } from "lucide-react";

import { PdfThumbnail } from "@/components/pdf/pdf-thumbnail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileListItemProps = {
  name: string;
  size: string;
  error?: string;
  isDragging?: boolean;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove?: () => void;
  pageCount?: number;
  previewUrl?: string;
  status?: "ready" | "error";
};

export function FileListItem({
  name,
  size,
  error,
  isDragging = false,
  onDragEnd,
  onDragStart,
  onDrop,
  onMoveDown,
  onMoveUp,
  onRemove,
  pageCount,
  previewUrl,
  status = "ready",
}: FileListItemProps) {
  return (
    <li
      className={cn(
        "flex min-h-20 flex-wrap items-center gap-3 rounded-xl border bg-white px-3 py-3 sm:px-4",
        status === "error" ? "border-red-200" : "border-zinc-200",
        isDragging && "opacity-50",
      )}
      draggable={Boolean(onDragStart)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (onDrop) {
          event.preventDefault();
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.();
      }}
    >
      {onDragStart ? (
        <GripVertical
          aria-hidden="true"
          className="size-5 shrink-0 text-zinc-400"
        />
      ) : null}
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
        <p className="mt-1 text-xs text-zinc-500">
          {size}
          {pageCount
            ? ` - ${pageCount} ${pageCount === 1 ? "page" : "pages"}`
            : ""}
        </p>
        {error ? (
          <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
        ) : null}
      </div>
      {onMoveUp || onMoveDown ? (
        <div className="flex shrink-0 gap-1">
          <Button
            aria-label={`Move ${name} up`}
            className="size-11 p-0"
            disabled={!onMoveUp}
            onClick={onMoveUp}
            type="button"
            variant="ghost"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label={`Move ${name} down`}
            className="size-11 p-0"
            disabled={!onMoveDown}
            onClick={onMoveDown}
            type="button"
            variant="ghost"
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}
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
