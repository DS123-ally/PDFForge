import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";

type PdfThumbnailProps = {
  label?: string;
  className?: string;
};

export function PdfThumbnail({ label = "PDF", className }: PdfThumbnailProps) {
  return (
    <span
      aria-label={`${label} document thumbnail`}
      className={cn(
        "grid size-14 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600",
        className,
      )}
      role="img"
    >
      <FileText aria-hidden="true" className="size-6" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
