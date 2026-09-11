import { CircleX, GripVertical } from "lucide-react";

import { PdfThumbnail } from "@/components/pdf/pdf-thumbnail";
import { Button } from "@/components/ui/button";

type FileListItemProps = {
  name: string;
  size: string;
};

export function FileListItem({ name, size }: FileListItemProps) {
  return (
    <li className="flex min-h-20 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
      <GripVertical
        aria-hidden="true"
        className="size-5 shrink-0 text-zinc-400"
      />
      <PdfThumbnail className="size-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={name}>
          {name}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{size}</p>
      </div>
      <Button
        aria-label={`Remove ${name}`}
        className="size-11 shrink-0 p-0"
        disabled
        type="button"
        variant="ghost"
      >
        <CircleX aria-hidden="true" className="size-5" />
      </Button>
    </li>
  );
}
