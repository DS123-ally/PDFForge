"use client";

import { useEffect } from "react";

import { getWorkspaceHref } from "@/lib/privacy/tool-location";

export function PreferHashUrl({ slug }: { slug: string }) {
  useEffect(() => {
    window.location.replace(getWorkspaceHref(slug));
  }, [slug]);

  return null;
}
