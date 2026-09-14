import type {
  PdfWorkerErrorCode,
  PdfWorkerResult,
} from "@/lib/workers/pdf-worker-types";

export type ProcessingStatus =
  "idle" | "processing" | "success" | "error" | "cancelled";

export type ProcessingState = {
  error?: {
    code: PdfWorkerErrorCode;
    message: string;
  };
  message: string;
  progress?: number;
  result?: PdfWorkerResult;
  status: ProcessingStatus;
};

export type ProcessingAction =
  | { type: "start"; message?: string }
  | { type: "progress"; message: string; progress: number }
  | { type: "complete"; result: PdfWorkerResult }
  | { type: "error"; code: PdfWorkerErrorCode; message: string }
  | { type: "cancelled"; message?: string }
  | { type: "reset" };

export const initialProcessingState: ProcessingState = {
  message: "Ready",
  status: "idle",
};

export function processingReducer(
  state: ProcessingState,
  action: ProcessingAction,
): ProcessingState {
  switch (action.type) {
    case "start":
      return {
        message: action.message ?? "Preparing files locally",
        progress: 0,
        status: "processing",
      };
    case "progress":
      return {
        message: action.message,
        progress: Math.min(100, Math.max(0, action.progress)),
        status: "processing",
      };
    case "complete":
      return {
        message: action.result.outputBytes
          ? "Your output is ready"
          : "Files are ready for local processing",
        progress: 100,
        result: action.result,
        status: "success",
      };
    case "error":
      return {
        error: {
          code: action.code,
          message: action.message,
        },
        message: action.message,
        status: "error",
      };
    case "cancelled":
      return {
        message: action.message ?? "Processing cancelled",
        status: "cancelled",
      };
    case "reset":
      return initialProcessingState;
    default:
      return state;
  }
}
