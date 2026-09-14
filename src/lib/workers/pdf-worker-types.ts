import type { PdfEditOptions } from "@/lib/pdf/edit-pdf";
import type {
  ImageFitMode,
  ImageOrientation,
  ImagePageSize,
} from "@/lib/pdf/image-layout";

export type PdfWorkerFile = {
  id: string;
  name: string;
  size: number;
  bytes: ArrayBuffer;
};

export type PdfWorkerOperation =
  "prepare" | "merge" | "split" | "organize" | "images-to-pdf" | "edit-pdf";

export type PdfWorkerSplitOptions = {
  mode: "extract" | "ranges" | "every-page";
  ranges?: string;
};

export type PdfWorkerOrganizePage = {
  id: string;
  pageNumber: number;
  rotation: number;
};

export type PdfWorkerOptions = {
  editPdf?: PdfEditOptions;
  imagesToPdf?: {
    fit: ImageFitMode;
    images: Array<{
      height: number;
      id: string;
      mimeType: string;
      width: number;
    }>;
    margin: number;
    orientation: ImageOrientation;
    pageSize: ImagePageSize;
  };
  organize?: {
    pages: PdfWorkerOrganizePage[];
  };
  split?: PdfWorkerSplitOptions;
};

export type PdfWorkerRequest =
  | {
      id: string;
      files: PdfWorkerFile[];
      operation: PdfWorkerOperation;
      options?: PdfWorkerOptions;
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
  filename?: string;
  outputMimeType?: string;
  outputBytes?: ArrayBuffer;
  totalBytes: number;
  totalPages: number;
};

export type PdfWorkerErrorCode =
  | "worker_unavailable"
  | "invalid_pdf"
  | "password_protected_pdf"
  | "processing_failed"
  | "invalid_page_range"
  | "cancelled";
