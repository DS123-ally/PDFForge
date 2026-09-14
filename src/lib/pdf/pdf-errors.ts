export type PdfErrorCode =
  | "password_protected"
  | "wrong_password"
  | "unsupported_encryption"
  | "corrupt"
  | "read_failed";

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

export class PdfWrongPasswordError extends PdfProcessingError {
  constructor() {
    super(
      "wrong_password",
      "That password does not open this PDF. It is not stored or logged.",
    );
    this.name = "PdfWrongPasswordError";
  }
}

export class PdfUnsupportedEncryptionError extends PdfProcessingError {
  constructor() {
    super(
      "unsupported_encryption",
      "This PDF uses an encryption method that cannot be unlocked as a vector document. PDFForge can rebuild an unlocked image-based copy instead.",
    );
    this.name = "PdfUnsupportedEncryptionError";
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

export function isWrongPasswordError(error: unknown) {
  return (
    error instanceof PdfWrongPasswordError ||
    (error instanceof Error &&
      error.message.toLowerCase().includes("wrong password"))
  );
}

export function isUnsupportedEncryptionError(error: unknown) {
  if (error instanceof PdfUnsupportedEncryptionError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("unsupported encryption") ||
    message.includes("object streams") ||
    message.includes("security handler") ||
    message.includes("adobe.pubsec")
  );
}
