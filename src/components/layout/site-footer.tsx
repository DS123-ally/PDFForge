import Link from "next/link";

import { Brand } from "@/components/layout/site-header";
import { comparisons } from "@/config/comparisons";
import { industries } from "@/config/industries";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/60 bg-white/50 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-7 sm:px-8 md:flex-row md:items-center">
        <Brand />
        <div className="flex flex-col gap-3">
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
          <nav
            aria-label="Comparisons and industries"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600"
          >
            {comparisons.map((page) => (
              <Link
                className="min-h-11 content-center hover:text-red-600"
                href={`/compare/${page.slug}`}
                key={page.slug}
              >
                vs {page.product}
              </Link>
            ))}
            {industries.map((page) => (
              <Link
                className="min-h-11 content-center hover:text-red-600"
                href={`/for/${page.slug}`}
                key={page.slug}
              >
                {page.navLabel}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
