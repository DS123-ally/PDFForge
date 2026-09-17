"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/tools#Organize", label: "Organize PDF" },
  { href: "/tools#Convert", label: "Convert PDF" },
  { href: "/tools#Edit", label: "Edit PDF" },
  { href: "/tools#Privacy", label: "Privacy tools" },
  { href: "/tools#Security", label: "Security tools" },
];

export function Brand() {
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-2 rounded-md font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-red-600"
      href="/"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-red-600 text-sm font-black text-white">
        P
      </span>
      <span>PDFForge</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/55 shadow-[0_8px_30px_rgba(24,24,27,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-zinc-700 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-emerald-600"
            />
            Files stay local
          </span>
        </nav>
        <Button
          aria-controls="mobile-navigation"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="size-11 p-0 lg:hidden"
          onClick={() => setOpen((current) => !current)}
          type="button"
          variant="ghost"
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>
      {open ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-zinc-200 bg-white px-5 py-4 lg:hidden"
          id="mobile-navigation"
        >
        <div className="mx-auto flex max-w-7xl flex-col">
          {navItems.map((item) => (
            <Link
              className="flex min-h-12 items-center rounded-lg px-3 font-semibold hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <span className="mt-2 inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-emerald-700">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-emerald-600"
            />
            Files stay local
          </span>
        </div>
      </nav>
      ) : null}
    </header>
  );
}
