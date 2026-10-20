import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-8", className)}
      fill="none"
      viewBox="0 0 32 32"
    >
      <rect fill="#ef2f2f" height="32" rx="8" width="32" />
      <path
        d="M9.2 8.2h8.4L22.8 13v11.2a1.6 1.6 0 0 1-1.6 1.6H9.2a1.6 1.6 0 0 1-1.6-1.6V9.8a1.6 1.6 0 0 1 1.6-1.6Z"
        fill="white"
      />
      <path d="M17.6 8.2 22.8 13h-3.6a1.6 1.6 0 0 1-1.6-1.6V8.2Z" fill="#fecaca" />
      <path
        d="M11.2 18.4h1.55c.82 0 1.32.42 1.32 1.05 0 .64-.5 1.07-1.32 1.07h-.85v1.15h-.7v-3.27Zm.7.55v.95h.62c.4 0 .62-.16.62-.48s-.22-.47-.62-.47h-.62Zm2.55-.55h.82c1.1 0 1.82.62 1.82 1.6 0 1-.72 1.62-1.82 1.62h-.82v-3.22Zm.7.55v2.12h.1c.64 0 1.02-.36 1.02-1.06s-.38-1.06-1.02-1.06h-.1Z"
        fill="#ef2f2f"
      />
    </svg>
  );
}
