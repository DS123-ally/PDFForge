export type PdfErrorCode = "password_protected" | "corrupt" | "read_failed";

export class PdfProcessingError extends Error {
  code: PdfErrorCode;
  userMessage: string;

  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = "PdfProcessingError";
    this.code = code;
    this.userMessage = message;
  }
}

export class PdfPasswordProtectedError extends PdfProcessingError {
  constructor() {
    super(
      "password_protected",
      "Password-protected PDFs are not supported in this step.",
    );
    this.name = "PdfPasswordProtectedError";
  }
}

export class PdfCorruptError extends PdfProcessingError {
  constructor() {
    super("corrupt", "This PDF appears to be corrupted or unreadable.");
    this.name = "PdfCorruptError";
  }
}

export function isEncryptedPdfError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "EncryptedPDFError" ||
      error.message.toLowerCase().includes("encrypted"))
  );
}
