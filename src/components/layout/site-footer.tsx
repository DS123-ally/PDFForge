import Link from "next/link";

import { Brand } from "@/components/layout/site-header";
import { comparisons } from "@/config/comparisons";
import { industries } from "@/config/industries";

export function SiteFooter() {
  return (
    <footer className="border-border/80 border-t bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 md:grid-cols-4 lg:grid-cols-5">
          <div className="md:col-span-2">
            <Brand />
            <p className="mt-3 max-w-sm text-xs leading-5 text-zinc-500">
              The zero-upload PDF studio. Process, redact, convert, and protect
              confidential documents securely within your browser&apos;s
              WebAssembly engine.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
              100% Client-Side Engine
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-zinc-900 uppercase">
              Platform
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-zinc-600">
              <li>
                <Link
                  className="hover:text-primary transition-colors"
                  href="/workspace"
                >
                  Workspace
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary transition-colors"
                  href="/tools"
                >
                  All Tools (25+)
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary transition-colors"
                  href="/privacy"
                >
                  Privacy Architecture
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary transition-colors"
                  href="/about"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary transition-colors"
                  href="/offline"
                >
                  Offline Use & PWA
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-zinc-900 uppercase">
              Comparisons
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-zinc-600">
              {comparisons.map((page) => (
                <li key={page.slug}>
                  <Link
                    className="hover:text-primary transition-colors"
                    href={`/compare/${page.slug}`}
                  >
                    PDFForge vs {page.product}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold tracking-wider text-zinc-900 uppercase">
              Solutions
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-zinc-600">
              {industries.map((page) => (
                <li key={page.slug}>
                  <Link
                    className="hover:text-primary transition-colors"
                    href={`/for/${page.slug}`}
                  >
                    {page.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-border/80 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs text-zinc-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} PDFForge. Built for privacy, speed, and
            safety.
          </p>
          <div className="flex items-center gap-4">
            <Link
              className="transition-colors hover:text-zinc-600"
              href="/privacy"
            >
              Privacy Notice
            </Link>
            <span>•</span>
            <Link
              className="transition-colors hover:text-zinc-600"
              href="/about"
            >
              Architecture
            </Link>
            <span>•</span>
            <span>No Cookies • No Trackers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
