export type PdfWorkerFile = {
  id: string;
  name: string;
  size: number;
  bytes: ArrayBuffer;
};

export type PdfWorkerRequest =
  | {
      id: string;
      files: PdfWorkerFile[];
      type: "prepare";
    }
  | {
      id: string;
      type: "cancel";
    };

export type PdfWorkerResponse =
  | {
      id: string;
      message: string;
      progress: number;
      type: "progress";
    }
  | {
      id: string;
      result: PdfWorkerResult;
      type: "complete";
    }
  | {
      id: string;
      reason: string;
      type: "cancelled";
    }
  | {
      code: PdfWorkerErrorCode;
      id: string;
      message: string;
      type: "error";
    };

export type PdfWorkerResult = {
  fileCount: number;
  totalBytes: number;
  totalPages: number;
};

export type PdfWorkerErrorCode =
  | "worker_unavailable"
  | "invalid_pdf"
  | "password_protected_pdf"
  | "processing_failed"
  | "cancelled";
