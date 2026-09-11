import { CheckCircle2, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  children: string;
  status?: "ready" | "pending";
};

export function StatusBadge({ children, status = "ready" }: StatusBadgeProps) {
  const Icon = status === "ready" ? CheckCircle2 : Clock3;

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-xs font-bold",
        status === "ready"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-800",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </span>
  );
}
