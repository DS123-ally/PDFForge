"use client";

import {
  ArrowLeft,
  ChevronDown,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { ToolCard } from "@/components/tools/tool-card";
import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { Button } from "@/components/ui/button";
import { directoryGroups, getTool, tools, type ToolCategory } from "@/config/tools";
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

  function selectTool(toolSlug: string) {
    window.location.hash = toolSlug;
    setShowToolSelector(false);
  }

  function clearActiveTool() {
    window.location.hash = "";
  }

  // If no tool is selected, render the Workspace Launcher Hub
  if (!tool) {
    return (
      <div className="space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-zinc-800 shadow-2xs w-fit">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Private Hash Mode Active</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500">Host only sees /workspace</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Local Workspace Hub
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Select any tool to load it directly into this isolated tab. All file processing, rendering, and cryptographic hashing happens entirely in your local browser memory.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["All", ...directoryGroups].map((cat) => (
              <button
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors cursor-pointer",
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
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" />
            <input
              className="h-9 w-full rounded-full border border-border bg-zinc-50/60 pl-9 pr-4 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
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
            <button
              className="group flex flex-col text-left rounded-2xl border border-border bg-white p-5 shadow-2xs transition-all hover:border-zinc-300 hover:shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
              key={t.slug}
              onClick={() => selectTool(t.slug)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                  {t.category}
                </span>
                <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Launch →
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-zinc-950 group-hover:text-primary transition-colors">
                {t.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {t.shortDescription}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // When a tool IS selected, render the Active Tool Studio
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Studio Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button
              className="inline-flex items-center gap-1 font-medium text-zinc-600 hover:text-zinc-950 cursor-pointer"
              onClick={clearActiveTool}
              type="button"
            >
              <ArrowLeft className="size-3" />
              <span>Workspace Hub</span>
            </button>
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
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Local RAM Sandbox</span>
          </div>

          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 cursor-pointer"
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
        <div className="rounded-2xl border border-border bg-white p-4 shadow-lg animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs text-zinc-500">
            <span className="font-semibold text-zinc-900">Switch active workspace tool</span>
            <button
              className="text-zinc-400 hover:text-zinc-600 cursor-pointer text-xs"
              onClick={() => setShowToolSelector(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid max-h-60 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <button
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                  t.slug === tool.slug
                    ? "bg-zinc-900 text-white font-medium"
                    : "hover:bg-zinc-100 text-zinc-700",
                )}
                key={t.slug}
                onClick={() => selectTool(t.slug)}
                type="button"
              >
                <span className="truncate">{t.title}</span>
                <span className="text-[10px] opacity-70 ml-2">{t.category}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Main Tool Execution Canvas */}
      <div className="rounded-3xl border border-border/90 bg-white p-5 shadow-xs sm:p-8">
        <ToolWorkspace tool={tool} />
      </div>
    </div>
  );
}
