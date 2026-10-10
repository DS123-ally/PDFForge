import type { PdfEditOptions } from "@/lib/pdf/edit-pdf";
import type { RecipeIntegrityTrail } from "@/lib/recipes/recipe-integrity";
import type {
  ImageFitMode,
  ImageOrientation,
  ImagePageSize,
} from "@/lib/pdf/image-layout";
import type { RecipeStep } from "@/lib/recipes/recipe";
import type { RedactionCheckResult } from "@/lib/pdf/redaction-check";

export type PdfWorkerFile = {
  id: string;
  name: string;
  size: number;
  bytes: ArrayBuffer;
};

export type PdfWorkerOperation =
  | "prepare"
  | "merge"
  | "split"
  | "organize"
  | "images-to-pdf"
  | "edit-pdf"
  | "protect-pdf"
  | "unlock-pdf"
  | "flatten-pdf"
  | "sanitize-pdf"
  | "recipe";

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
  flattenPdf?: Record<string, never>;
  passwordPdf?: {
    password: string;
  };
  sanitizePdf?: {
    dropAttachments: boolean;
    dropJavascript: boolean;
    flattenForms: boolean;
    stripFormValues: boolean;
    stripImageExif: boolean;
    stripMetadata: boolean;
  };
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
  recipe?: {
    steps: RecipeStep[];
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
  integrityTrail?: RecipeIntegrityTrail;
  outputMimeType?: string;
  outputBytes?: ArrayBuffer;
  redactionCheck?: RedactionCheckResult;
  totalBytes: number;
  totalPages: number;
};

export type PdfWorkerErrorCode =
  | "worker_unavailable"
  | "invalid_pdf"
  | "password_protected_pdf"
  | "processing_failed"
  | "invalid_page_range"
  | "wrong_password"
  | "unsupported_encryption"
  | "cancelled";
