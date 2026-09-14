import type { PdfWorkerOperation } from "@/lib/workers/pdf-worker-types";

const sensitiveOperations = new Set<PdfWorkerOperation>([
  "protect-pdf",
  "unlock-pdf",
]);

export function shouldReusePdfWorker(operation: PdfWorkerOperation) {
  return !sensitiveOperations.has(operation);
}
