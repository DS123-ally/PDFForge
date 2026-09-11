import Link from "next/link";

import { Brand } from "@/components/layout/site-header";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-7 sm:px-8 md:flex-row md:items-center">
        <Brand />
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600"
        >
          <Link
            className="min-h-11 content-center hover:text-red-600"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="min-h-11 content-center hover:text-red-600"
            href="/about"
          >
            How it works
          </Link>
          <Link
            className="min-h-11 content-center hover:text-red-600"
            href="/offline"
          >
            Offline use
          </Link>
          <span>© 2026 PDFForge</span>
        </nav>
      </div>
    </footer>
  );
}
