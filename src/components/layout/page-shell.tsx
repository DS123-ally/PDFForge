import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950">
      <a
        className="sr-only z-50 rounded-md bg-white px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-red-600"
        href="#main-content"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
