import { cn } from "@/lib/utils";

type ProgressIndicatorProps = {
  value?: number;
  label: string;
  className?: string;
};

export function ProgressIndicator({
  value,
  label,
  className,
}: ProgressIndicatorProps) {
  const normalized =
    value === undefined ? undefined : Math.min(100, Math.max(0, value));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4 text-xs font-semibold">
        <span>{label}</span>
        {normalized !== undefined ? <span>{normalized}%</span> : null}
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalized}
      >
        <div
          className={cn(
            "h-full rounded-full bg-red-600",
            normalized === undefined && "w-1/3 animate-pulse",
          )}
          style={
            normalized === undefined ? undefined : { width: `${normalized}%` }
          }
        />
      </div>
    </div>
  );
}
