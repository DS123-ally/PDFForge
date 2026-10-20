"use client";

import { ArrowRight, Layers, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandMark } from "@/components/layout/brand-mark";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/tools#Organize", label: "Organize" },
  { href: "/tools#Convert", label: "Convert" },
  { href: "/tools#Edit", label: "Edit" },
  { href: "/tools#Security", label: "Security" },
  { href: "/tools#Privacy", label: "Privacy" },
  { href: "/workspace#private-recipes", label: "Recipes" },
];

export function Brand() {
  return (
    <Link
      className="inline-flex items-center gap-2.5 rounded-full font-semibold tracking-tight transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
      href="/"
    >
      <BrandMark className="size-8" />
      <div className="flex flex-col">
        <span className="text-sm font-bold tracking-tight text-zinc-950 sm:text-base">
          PDFForge
        </span>
      </div>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-border/80 bg-white/85 px-4 py-2 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Brand />
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 xl:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Local Sandbox
          </span>
        </div>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-primary"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-primary"
            href="/tools"
          >
            All tools
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className={cn(
              buttonStyles("secondary", "sm"),
              "hidden sm:inline-flex text-xs",
            )}
            href="/tools"
          >
            <Layers className="size-3.5" />
            <span>Tools</span>
          </Link>
          <Link
            className={cn(
              buttonStyles("primary", "sm"),
              "text-xs px-3.5 shadow-xs",
            )}
            href="/workspace"
          >
            <span>Workspace</span>
            <ArrowRight className="size-3" />
          </Link>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-white text-zinc-700 hover:bg-zinc-50 lg:hidden focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => setOpen((prev) => !prev)}
            type="button"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="mx-auto mt-2 max-w-6xl rounded-2xl border border-border/80 bg-white/95 p-4 shadow-lg backdrop-blur-md lg:hidden animate-in fade-in slide-in-from-top-2 duration-150"
          id="mobile-navigation"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs text-zinc-500">
            <span>Navigation</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              100% Client-side
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 pt-3">
            {navItems.map((item) => (
              <Link
                className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              href="/tools"
              onClick={() => setOpen(false)}
            >
              All tools (25+)
            </Link>
            <Link
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-red-50"
              href="/workspace"
              onClick={() => setOpen(false)}
            >
              Open Workspace →
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
