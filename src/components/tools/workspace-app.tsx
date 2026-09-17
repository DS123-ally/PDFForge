"use client";

import { useSyncExternalStore } from "react";

import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { EmptyState } from "@/components/ui/empty-state";
import { getTool } from "@/config/tools";
import { captureWorkspaceToolSlug } from "@/lib/privacy/tool-location";

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

  if (!tool) {
    return (
      <EmptyState
        description="Choose a tool from All tools. The selected tool stays in the page hash so the host only sees /workspace."
        title="No local tool selected"
      />
    );
  }

  return (
    <>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
        {tool.title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">
        {tool.description}
      </p>
      <div className="mt-8">
        <ToolWorkspace tool={tool} />
      </div>
    </>
  );
}
