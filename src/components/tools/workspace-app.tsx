"use client";

import { useLayoutEffect, useState } from "react";

import { ToolWorkspace } from "@/components/tools/tool-workspace";
import { EmptyState } from "@/components/ui/empty-state";
import { getTool } from "@/config/tools";
import { readWorkspaceSlug } from "@/lib/privacy/tool-location";

export function WorkspaceApp() {
  const [slug, setSlug] = useState("");

  useLayoutEffect(() => {
    function syncHash() {
      setSlug(readWorkspaceSlug(window.location.hash));
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

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
