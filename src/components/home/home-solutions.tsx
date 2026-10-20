import { ArrowUpRight, FileStack, LockKeyhole, Send, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { getToolHref, getToolsCategoryHref } from "@/lib/privacy/tool-location";
import { getRecipePresetHref } from "@/lib/recipes/recipe";

const solutions = [
  {
    badge: "Automation Recipe",
    action: "Run Send Recipe",
    body: "Strip metadata, redact detected text, flatten forms, add watermarks, and AES-256 password-protect in a single in-memory pipeline.",
    href: getRecipePresetHref("send-externally"),
    icon: Send,
    title: "Sanitize & Lock Before Sharing",
  },
  {
    badge: "PII Security",
    action: "Scan PDF for IDs",
    body: "Detect Aadhaar, PAN, credit cards, emails, and sensitive identifiers locally, then redact matches before anything leaves your machine.",
    href: getToolHref("privacy-risk-scanner"),
    icon: ShieldAlert,
    title: "Inspect & Redact Sensitive IDs",
  },
  {
    badge: "Universal Engine",
    action: "Explore Converters",
    body: "Convert Word documents, Excel sheets, PowerPoint decks, CSV tables, and Markdown into clean, ready-to-share PDF files.",
    href: getToolsCategoryHref("Convert"),
    icon: FileStack,
    title: "Office & Images to PDF",
  },
  {
    badge: "Zero-Knowledge",
    action: "Protect with Password",
    body: "Standard AES-256 encryption applied directly inside your browser. No passwords sent to any server, and no master keys exist.",
    href: getToolHref("password-protect-pdf"),
    icon: LockKeyhole,
    title: "Client-Side Encryption",
  },
] as const;

export function HomeSolutions() {
  return (
    <section
      aria-labelledby="solutions-title"
      className="border-t border-border/80 bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Solutions"
          id="solutions-title"
          title="Engineered for tasks that cannot touch the cloud"
        >
          Confidential financial records, compliance data, legal documents, and personal IDs that require absolute privacy.
        </SectionHeading>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {solutions.map((item) => {
            const Icon = item.icon;

            return (
              <article
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                key={item.title}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200/80 transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="rounded-full border border-border bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-base font-semibold tracking-tight text-zinc-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    {item.body}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <Link
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-red-700"
                    href={item.href}
                  >
                    <span>{item.action}</span>
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
