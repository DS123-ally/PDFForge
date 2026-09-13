export type FileErrorCode =
  | "unsupported_type"
  | "empty_file"
  | "file_too_large"
  | "duplicate_file"
  | "invalid_pdf"
  | "password_protected_pdf"
  | "read_failed";

const defaultMessages: Record<FileErrorCode, string> = {
  unsupported_type: "Choose a supported file type for this tool.",
  empty_file: "This file is empty. Choose a different file.",
  file_too_large: "This file is larger than the supported limit.",
  duplicate_file: "This file is already in the list.",
  invalid_pdf: "This PDF appears to be corrupted or unreadable.",
  password_protected_pdf:
    "Password-protected PDFs are not supported in this step.",
  read_failed: "This file could not be read by your browser.",
};

export class FilePipelineError extends Error {
  code: FileErrorCode;
  userMessage: string;

  constructor(code: FileErrorCode, message = defaultMessages[code]) {
    super(message);
    this.name = "FilePipelineError";
    this.code = code;
    this.userMessage = message;
  }
}

export function toFilePipelineError(error: unknown): FilePipelineError {
  if (error instanceof FilePipelineError) {
    return error;
  }

  return new FilePipelineError("read_failed");
}
