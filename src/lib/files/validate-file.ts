import { FilePipelineError } from "@/lib/files/file-errors";
import {
  PdfCorruptError,
  PdfPasswordProtectedError,
} from "@/lib/pdf/pdf-errors";
import { loadPdf } from "@/lib/pdf/load-pdf";

export type AcceptedFileType = "pdf" | "image";

export type FileValidationOptions = {
  acceptedTypes?: readonly AcceptedFileType[];
  existingFingerprints?: ReadonlySet<string>;
  maxFileSizeBytes?: number;
};

export type ValidatedFile = {
  file: File;
  fingerprint: string;
};

export const defaultMaxFileSizeBytes = 100 * 1024 * 1024;

export function createFileFingerprint(file: File) {
  return `${file.name.toLowerCase()}::${file.size}::${file.lastModified}`;
}

export function getAcceptAttribute(acceptedTypes: readonly AcceptedFileType[]) {
  const accepts = new Set<string>();

  if (acceptedTypes.includes("pdf")) {
    accepts.add(".pdf");
    accepts.add("application/pdf");
  }

  if (acceptedTypes.includes("image")) {
    accepts.add(".jpg");
    accepts.add(".jpeg");
    accepts.add(".png");
    accepts.add("image/jpeg");
    accepts.add("image/png");
  }

  return Array.from(accepts).join(",");
}

export async function validateFile(
  file: File,
  options: FileValidationOptions = {},
): Promise<ValidatedFile> {
  const acceptedTypes = options.acceptedTypes ?? ["pdf"];
  const maxFileSizeBytes = options.maxFileSizeBytes ?? defaultMaxFileSizeBytes;
  const fingerprint = createFileFingerprint(file);

  if (options.existingFingerprints?.has(fingerprint)) {
    throw new FilePipelineError("duplicate_file");
  }

  if (file.size === 0) {
    throw new FilePipelineError("empty_file");
  }

  if (file.size > maxFileSizeBytes) {
    throw new FilePipelineError(
      "file_too_large",
      `This file is larger than ${formatLimit(maxFileSizeBytes)}.`,
    );
  }

  if (!isAcceptedFileType(file, acceptedTypes)) {
    throw new FilePipelineError("unsupported_type");
  }

  if (isPdfFile(file)) {
    await validatePdfFile(file);
  }

  return { file, fingerprint };
}

export async function validateFiles(
  files: readonly File[],
  options: FileValidationOptions = {},
) {
  const valid: ValidatedFile[] = [];
  const errors: Array<{ file: File; error: FilePipelineError }> = [];
  const fingerprints = new Set(options.existingFingerprints);

  for (const file of files) {
    try {
      const result = await validateFile(file, {
        ...options,
        existingFingerprints: fingerprints,
      });
      fingerprints.add(result.fingerprint);
      valid.push(result);
    } catch (error) {
      errors.push({
        file,
        error:
          error instanceof FilePipelineError
            ? error
            : new FilePipelineError("read_failed"),
      });
    }
  }

  return { valid, errors };
}

function isAcceptedFileType(
  file: File,
  acceptedTypes: readonly AcceptedFileType[],
) {
  return acceptedTypes.some((type) => {
    if (type === "pdf") {
      return isPdfFile(file);
    }

    return isImageFile(file);
  });
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImageFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  );
}

async function validatePdfFile(file: File) {
  const header = await file.slice(0, 5).text();

  if (header !== "%PDF-") {
    throw new FilePipelineError("invalid_pdf");
  }

  try {
    await loadPdf(file);
  } catch (error) {
    if (error instanceof PdfPasswordProtectedError) {
      throw new FilePipelineError("password_protected_pdf");
    }

    if (error instanceof PdfCorruptError) {
      throw new FilePipelineError("invalid_pdf");
    }

    throw new FilePipelineError("read_failed");
  }
}

function formatLimit(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1) {
    return `${Math.round(megabytes)} MB`;
  }

  return `${bytes} bytes`;
}
