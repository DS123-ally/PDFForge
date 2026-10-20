import { ArrowDown, ArrowUp, CircleX, GripVertical, Lock } from "lucide-react";

import { PdfThumbnail } from "@/components/pdf/pdf-thumbnail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileListItemProps = {
  name: string;
  size: string;
  error?: string;
  isDragging?: boolean;
  note?: string;
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
  note,
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
        "group/item flex items-center gap-3 rounded-xl border bg-white p-3 shadow-2xs transition-all",
        status === "error"
          ? "border-red-200 bg-red-50/20"
          : "border-border/80 hover:border-zinc-300",
        isDragging && "scale-[0.99] opacity-40",
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
        <button
          aria-label="Drag to reorder"
          className="focus-visible:outline-primary cursor-grab text-zinc-400 hover:text-zinc-600 focus-visible:outline-2 active:cursor-grabbing"
          type="button"
        >
          <GripVertical aria-hidden="true" className="size-4 shrink-0" />
        </button>
      ) : null}

      <div className="border-border/80 size-10 shrink-0 overflow-hidden rounded-lg border bg-zinc-50">
        <PdfThumbnail className="size-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {previewUrl ? (
            <a
              className="hover:text-primary focus-visible:outline-primary truncate text-xs font-semibold text-zinc-900 transition-colors focus-visible:outline-2"
              href={previewUrl}
              rel="noopener"
              target="_blank"
              title={name}
            >
              {name}
            </a>
          ) : (
            <p
              className="truncate text-xs font-semibold text-zinc-900"
              title={name}
            >
              {name}
            </p>
          )}

          {note ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <Lock className="size-2.5" />
              {note}
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="font-mono">{size}</span>
          {pageCount ? (
            <>
              <span>•</span>
              <span>
                {pageCount} {pageCount === 1 ? "page" : "pages"}
              </span>
            </>
          ) : null}
        </div>

        {error ? (
          <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {onMoveUp || onMoveDown ? (
          <div className="flex items-center gap-0.5">
            <Button
              aria-label={`Move ${name} up`}
              className="size-7 rounded-md p-0 text-zinc-500 hover:text-zinc-950"
              disabled={!onMoveUp}
              onClick={onMoveUp}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
            </Button>
            <Button
              aria-label={`Move ${name} down`}
              className="size-7 rounded-md p-0 text-zinc-500 hover:text-zinc-950"
              disabled={!onMoveDown}
              onClick={onMoveDown}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ArrowDown aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        ) : null}

        {onRemove ? (
          <Button
            aria-label={`Remove ${name}`}
            className="size-7 rounded-md p-0 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            <CircleX aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
