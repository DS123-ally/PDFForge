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
      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-700">
        <span className="truncate">{label}</span>
        {normalized !== undefined ? (
          <span className="font-mono text-zinc-900">{normalized}%</span>
        ) : null}
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalized}
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-black/5"
        role="progressbar"
      >
        <div
          className={cn(
            "bg-primary h-full rounded-full transition-all duration-300 ease-out",
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
