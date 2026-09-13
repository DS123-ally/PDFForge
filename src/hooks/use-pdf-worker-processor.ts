"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import type { LocalUploadedFile } from "@/components/pdf/file-uploader";
import { PdfWorkerClient } from "@/lib/workers/pdf-worker-client";
import {
  initialProcessingState,
  processingReducer,
} from "@/lib/workers/processing-state";
import type { PdfWorkerFile } from "@/lib/workers/pdf-worker-types";

type WorkerOperation = "prepare" | "merge";

export function usePdfWorkerProcessor() {
  const [state, dispatch] = useReducer(
    processingReducer,
    initialProcessingState,
  );
  const clientRef = useRef<PdfWorkerClient | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const cleanupWorker = useCallback(() => {
    clientRef.current?.terminate();
    clientRef.current = null;
    jobIdRef.current = null;
  }, []);

  useEffect(() => cleanupWorker, [cleanupWorker]);

  const reset = useCallback(() => {
    cleanupWorker();
    dispatch({ type: "reset" });
  }, [cleanupWorker]);

  const cancel = useCallback(() => {
    const jobId = jobIdRef.current;

    if (!jobId) {
      return;
    }

    clientRef.current?.cancel(jobId);
    dispatch({ type: "cancelled" });
    cleanupWorker();
  }, [cleanupWorker]);

  const start = useCallback(
    async (
      selectedFiles: readonly LocalUploadedFile[],
      operation: WorkerOperation = "prepare",
    ) => {
      if (selectedFiles.length === 0) {
        return;
      }

      cleanupWorker();
      dispatch({ type: "start" });

      const jobId = createJobId();
      jobIdRef.current = jobId;

      try {
        const files = await Promise.all(
          selectedFiles.map(async (selectedFile): Promise<PdfWorkerFile> => ({
            bytes: await selectedFile.file.arrayBuffer(),
            id: selectedFile.id,
            name: selectedFile.file.name,
            size: selectedFile.file.size,
          })),
        );
        const client = new PdfWorkerClient({
          onMessage: (message) => {
            if (message.id !== jobIdRef.current) {
              return;
            }

            if (message.type === "progress") {
              dispatch({
                message: message.message,
                progress: message.progress,
                type: "progress",
              });
              return;
            }

            if (message.type === "complete") {
              dispatch({ result: message.result, type: "complete" });
              cleanupWorker();
              return;
            }

            if (message.type === "cancelled") {
              dispatch({ message: message.reason, type: "cancelled" });
              cleanupWorker();
              return;
            }

            dispatch({
              code: message.code,
              message: message.message,
              type: "error",
            });
            cleanupWorker();
          },
        });

        clientRef.current = client;
        client.prepare(jobId, files, operation);
      } catch {
        dispatch({
          code: "worker_unavailable",
          message: "The local worker could not start in this browser.",
          type: "error",
        });
        cleanupWorker();
      }
    },
    [cleanupWorker],
  );

  return {
    cancel,
    reset,
    start,
    state,
  };
}

function createJobId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `job-${Date.now()}`;
}
