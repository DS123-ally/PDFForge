import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function GlassPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-panel rounded-3xl p-6 sm:p-8", className)}>
      {children}
    </div>
  );
}
