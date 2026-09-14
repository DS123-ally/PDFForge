"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

export function PwaProvider() {
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    async function register() {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      if (cancelled) {
        return;
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setUpdateWorker(worker);
          }
        });
      });
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!updateWorker) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-20 z-50 max-w-sm md:bottom-4">
      <Toast
        message="A new PDFForge version is ready. Reload to update the app shell. Documents are never cached."
        onDismiss={() => setUpdateWorker(null)}
        tone="success"
      />
      <Button
        className="mt-3 w-full"
        onClick={() => {
          updateWorker.postMessage("SKIP_WAITING");
          window.location.reload();
        }}
        type="button"
      >
        Reload app
      </Button>
    </div>
  );
}
