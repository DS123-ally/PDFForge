"use client";

import { ArrowLeft, ChevronDown, Layers, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { directoryGroups, getTool, tools } from "@/config/tools";
import { captureWorkspaceToolSlug } from "@/lib/privacy/tool-location";
import { cn } from "@/lib/utils";

function subscribeWorkspaceHash(onStoreChange: () => void) {
  const notify = () => {
    captureWorkspaceToolSlug();
    onStoreChange();
  };

  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  const interval = window.setInterval(() => {
    notify();

    if (document.documentElement.dataset.workspaceTool) {
      window.clearInterval(interval);
    }
  }, 100);

  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("popstate", notify);
    window.clearInterval(interval);
  };
}

function getWorkspaceHashSnapshot() {
  return captureWorkspaceToolSlug();
}

function getWorkspaceHashServerSnapshot() {
  return "";
}

export function WorkspaceApp() {
  const slug = useSyncExternalStore(
    subscribeWorkspaceHash,
    getWorkspaceHashSnapshot,
    getWorkspaceHashServerSnapshot,
  );
  const tool = slug ? getTool(slug) : undefined;
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showToolSelector, setShowToolSelector] = useState(false);

  useEffect(() => {
    captureWorkspaceToolSlug();
  }, []);

  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tools.filter((t) => {
      const matchCat =
        activeCategory === "All" || t.category === activeCategory;
      const matchQuery =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  // If no tool is selected, render the Workspace Launcher Hub
  if (!tool) {
    return (
      <div className="animate-in fade-in space-y-8 duration-200">
        <div className="flex flex-col gap-2">
          <div className="border-border inline-flex w-fit items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-zinc-800 shadow-2xs">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <span>Private Hash Mode Active</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500">Host only sees /workspace</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Local Workspace Hub
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Select any tool to load it directly into this isolated tab. All file
            processing, rendering, and cryptographic hashing happens entirely in
            your local browser memory.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="border-border/80 flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["All", ...directoryGroups].map((cat) => (
              <button
                className={cn(
                  "inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900",
                )}
                key={cat}
                onClick={() => setActiveCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-zinc-400" />
            <input
              className="border-border h-9 w-full rounded-full border bg-zinc-50/60 pr-4 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter workspace tools..."
              type="search"
              value={searchQuery}
            />
          </div>
        </div>

        {/* Tool Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map((t) => (
            <Link
              className="group border-border focus-visible:outline-primary flex flex-col rounded-2xl border bg-white p-5 text-left shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs focus-visible:outline-2"
              href={`/workspace#${t.slug}`}
              key={t.slug}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                  {t.category}
                </span>
                <span className="text-primary text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  Launch →
                </span>
              </div>
              <h3 className="group-hover:text-primary mt-3 text-sm font-bold text-zinc-950 transition-colors">
                {t.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {t.shortDescription}
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // When a tool IS selected, render the Active Tool Studio
  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      {/* Studio Header Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link
              className="inline-flex items-center gap-1 font-medium text-zinc-600 hover:text-zinc-950"
              href="/workspace"
            >
              <ArrowLeft className="size-3" />
              <span>Workspace Hub</span>
            </Link>
            <span>/</span>
            <span className="font-medium text-zinc-700">{tool.category}</span>
            <span>/</span>
            <span className="font-semibold text-zinc-950">{tool.title}</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            {tool.title}
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600 sm:text-sm">
            {tool.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 sm:inline-flex">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
            <span>Local RAM Sandbox</span>
          </div>

          <button
            className="border-border inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50"
            onClick={() => setShowToolSelector(!showToolSelector)}
            type="button"
          >
            <Layers className="size-3.5 text-zinc-500" />
            <span>Switch Tool</span>
            <ChevronDown className="size-3 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Dropdown tool switcher modal / bar */}
      {showToolSelector ? (
        <div className="border-border animate-in fade-in rounded-2xl border bg-white p-4 shadow-lg duration-150">
          <div className="border-border flex items-center justify-between border-b pb-3 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-900">
              Switch active workspace tool
            </span>
            <button
              className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600"
              onClick={() => setShowToolSelector(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid max-h-60 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <Link
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors",
                  t.slug === tool.slug
                    ? "bg-zinc-900 font-medium text-white"
                    : "text-zinc-700 hover:bg-zinc-100",
                )}
                href={`/workspace#${t.slug}`}
                key={t.slug}
                onClick={() => setShowToolSelector(false)}
              >
                <span className="truncate">{t.title}</span>
                <span className="ml-2 text-[10px] opacity-70">
                  {t.category}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Tool Execution Canvas */}
      <div className="border-border/90 rounded-3xl border bg-white p-5 shadow-xs sm:p-8">
        <ToolWorkspace tool={tool} />
      </div>
    </div>
  );
}
