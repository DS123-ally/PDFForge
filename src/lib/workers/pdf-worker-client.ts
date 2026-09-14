import type {
  PdfWorkerFile,
  PdfWorkerOperation,
  PdfWorkerOptions,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from "@/lib/workers/pdf-worker-types";

type WorkerHandlers = {
  onMessage: (message: PdfWorkerResponse) => void;
};

export class PdfWorkerClient {
  private worker: Worker;

  constructor({ onMessage }: WorkerHandlers) {
    this.worker = new Worker(
      new URL("../../workers/pdf.worker.ts", import.meta.url),
      {
        name: "pdfforge-pdf-worker",
        type: "module",
      },
    );
    this.worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      onMessage(event.data);
    };
  }

  prepare(
    id: string,
    files: PdfWorkerFile[],
    operation: PdfWorkerOperation,
    options?: PdfWorkerOptions,
  ) {
    const request: PdfWorkerRequest = {
      files,
      id,
      operation,
      options,
      type: "prepare",
    };
    const transfers = files.map((file) => file.bytes);

    this.worker.postMessage(request, transfers);
  }

  cancel(id: string) {
    const request: PdfWorkerRequest = { id, type: "cancel" };
    this.worker.postMessage(request);
  }

  terminate() {
    this.worker.terminate();
  }
}
