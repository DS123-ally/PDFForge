"use client";

import {
  ArrowRight,
  Cpu,
  HardDriveDownload,
  LockKeyhole,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FormatLogo, formatLogos } from "@/components/home/format-logos";
import { FileUploader } from "@/components/pdf/file-uploader";
import { buttonStyles } from "@/components/ui/button";
import { getToolHref } from "@/lib/privacy/tool-location";
import { cn } from "@/lib/utils";

const quickTools = [
  {
    slug: "merge-pdf",
    label: "Merge PDF",
    badge: "Most Popular",
  },
  {
    slug: "compress-pdf",
    label: "Compress",
    badge: "Fast",
  },
  {
    slug: "privacy-risk-scanner",
    label: "Scan PII / IDs",
    badge: "Security",
  },
  {
    slug: "password-protect-pdf",
    label: "Protect & Lock",
    badge: "AES-256",
  },
  {
    slug: "private-recipes",
    label: "Automated Recipes",
    badge: "Workflows",
  },
] as const;

const trustPillars = [
  {
    icon: ShieldCheck,
    label: "Zero Server Uploads",
    desc: "Your documents never leave your device",
  },
  {
    icon: Cpu,
    label: "WebAssembly Engine",
    desc: "Blazing fast client-side PDF rendering",
  },
  {
    icon: LockKeyhole,
    label: "Hardware-grade AES-256",
    desc: "Browser native cryptography standards",
  },
  {
    icon: WifiOff,
    label: "100% Offline Ready",
    desc: "Works without an internet connection",
  },
];

export function HomeHero() {
  const [activeTab, setActiveTab] = useState("merge-pdf");

  return (
    <section className="bg-background relative overflow-hidden px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
      {/* Background Reframe subtle grid pattern */}
      <div
        aria-hidden="true"
        className="reframe-grid-bg pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)] opacity-70"
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Eyebrow badge */}
        <div className="flex justify-center">
          <Link
            className="group border-border/80 inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-1 text-xs font-medium text-zinc-800 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs"
            href="/workspace"
          >
            <span className="flex size-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-zinc-600">Private Studio</span>
            <span className="text-zinc-300">•</span>
            <span className="font-semibold text-zinc-950">
              Zero Network Uploads
            </span>
            <ArrowRight className="size-3 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Hero Title */}
        <div className="mx-auto mt-6 max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-[-0.035em] text-balance text-zinc-950 sm:text-6xl sm:leading-[1.05] md:text-7xl">
            Clean, redact, and share{" "}
            <span className="block font-normal text-zinc-400 sm:mt-1">
              without uploading.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Merge, edit, convert, and lock PDFs on this device. Nothing is sent
            to a server.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              className={cn(buttonStyles("primary", "lg"), "shadow-sm")}
              href="/workspace"
            >
              <span>Open Workspace</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link className={buttonStyles("secondary", "lg")} href="/tools">
              <span>Explore 25+ Tools</span>
            </Link>
          </div>
        </div>

        {/* Reframe Studio Canvas / Interactive Dropzone Box */}
        <div className="border-border/90 relative mx-auto mt-14 max-w-4xl rounded-3xl border bg-white p-3 shadow-lg ring-1 ring-black/[0.03] sm:p-5">
          {/* Top Canvas Bar */}
          <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto py-1">
              {quickTools.map((tool) => (
                <Link
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
                    activeTab === tool.slug
                      ? "bg-zinc-900 text-white shadow-2xs"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900",
                  )}
                  href={getToolHref(tool.slug)}
                  key={tool.slug}
                  onClick={() => setActiveTab(tool.slug)}
                >
                  <span>{tool.label}</span>
                </Link>
              ))}
            </div>

            <div className="hidden items-center gap-2 text-xs font-medium text-emerald-700 sm:flex">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <span>Engine Status: Ready (0 KB transferred)</span>
            </div>
          </div>

          {/* Center Dropzone */}
          <div className="mt-4" id="drop-files">
            <FileUploader multiple tone="soft" />
          </div>

          {/* Canvas Footer Telemetry Strip */}
          <div className="border-border/70 mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs text-zinc-500 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Local Sandbox</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-zinc-700" />
              <span>WASM Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-zinc-700" />
              <span>AES-256 Crypto</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDriveDownload className="size-4 text-zinc-700" />
              <span>Instant Download</span>
            </div>
          </div>
        </div>

        {/* Reframe Trust / Feature Grid Bar */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                className="border-border/80 flex items-start gap-3.5 rounded-2xl border bg-white/70 p-4 shadow-2xs backdrop-blur-xs transition-colors hover:border-zinc-300"
                key={pillar.label}
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-900">
                  <Icon className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">
                    {pillar.label}
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Supported formats, one continuous line */}
        <div className="mt-16">
          <p className="text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Supported Local File Formats
          </p>
          <div className="relative mt-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="format-flow flex w-max motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center">
              {[0, 1].map((copy) => (
                <ul
                  aria-hidden={copy === 1}
                  className={cn(
                    "flex shrink-0 items-center gap-3 pr-3",
                    copy === 0 &&
                      "motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:pr-0",
                    copy === 1 && "motion-reduce:hidden",
                  )}
                  key={copy}
                >
                  {formatLogos.map((format) => (
                    <li
                      className="border-border/80 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-700 shadow-2xs"
                      key={format.name}
                    >
                      <FormatLogo
                        className="size-5 rounded-md"
                        name={format.name}
                      />
                      <span>{format.name}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
