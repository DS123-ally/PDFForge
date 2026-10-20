import { ArrowRight, Check, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const included = [
  "100% In-browser WebAssembly execution",
  "Zero file transmission over the network",
  "No account creation or credit card needed",
  "No watermarks added to downloaded files",
  "Multi-step automated recipe pipelines",
  "No file size or daily document caps",
  "Instant session clearance on tab close",
  "Full offline capability as a PWA",
];

export function HomePricing() {
  return (
    <section
      aria-labelledby="pricing-title"
      className="border-t border-border/80 bg-zinc-50/50 px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-2xs">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Open & Transparent</span>
          </div>

          <h2
            className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl"
            id="pricing-title"
          >
            Zero cost. Zero subscriptions.
            <span className="block text-zinc-400">Zero data collection.</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-600">
            PDFForge runs entirely on your computer hardware using your browser&apos;s WebAssembly engine. Because we don&apos;t maintain server-side document storage or cloud processing infrastructure, there is no subscription cost to pass on to you.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link
              className={cn(buttonStyles("primary", "lg"), "shadow-sm")}
              href="/workspace"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className={buttonStyles("secondary", "lg")}
              href="/about"
            >
              <span>How It Works</span>
            </Link>
          </div>
        </div>

        {/* Pricing / Trust Card */}
        <div className="rounded-3xl border border-border bg-white p-7 shadow-lg ring-1 ring-black/[0.03] sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div>
              <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Privacy-First Plan
              </span>
              <h3 className="text-3xl font-bold tracking-tight text-zinc-950">
                Free Forever
              </h3>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              Community Supported
            </span>
          </div>

          <p className="mt-5 text-xs text-zinc-500">
            Everything you need for enterprise-grade PDF operations in an isolated local sandbox:
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {included.map((item) => (
              <li
                className="flex items-start gap-2.5 text-xs font-medium text-zinc-800"
                key={item}
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-6 border-t border-border/80 flex items-center justify-between text-xs text-zinc-500">
            <span>Client RAM based</span>
            <span className="font-mono text-[11px] text-zinc-400">
              WASM + AES-256 + PDF-LIB
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
