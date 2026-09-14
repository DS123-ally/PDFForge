"use client";

import { useEffect } from "react";

import { runTemporaryCleanup } from "@/lib/privacy/temporary-data";

export function PrivacyCleanupProvider() {
  useEffect(() => {
    function handlePageHide(event: PageTransitionEvent) {
      if (event.persisted) {
        return;
      }

      runTemporaryCleanup();
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", runTemporaryCleanup);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", runTemporaryCleanup);
      runTemporaryCleanup();
    };
  }, []);

  return null;
}
