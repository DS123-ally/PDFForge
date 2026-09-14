"use client";

import { useEffect, useState } from "react";

import { findExtensionInjectedNodes } from "@/lib/privacy/extension-guard";

export function ExtensionGuard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function scan() {
      setVisible(findExtensionInjectedNodes(document).length > 0);
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "href"],
    });

    return () => observer.disconnect();
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 top-16 z-50 mx-auto max-w-3xl px-5"
      role="alert"
    >
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 shadow-lg">
        A browser extension injected extra resources into this page. Extensions
        can read documents open in this tab. Use a clean browser profile without
        extensions before processing sensitive files.
      </p>
    </div>
  );
}
