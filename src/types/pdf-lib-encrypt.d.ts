declare module "pdf-lib-encrypt" {
  import type { PDFDocument } from "pdf-lib";

  export function configure(pdfLib: typeof import("pdf-lib")): void;

  export function lock(
    bytes: Uint8Array,
    password: string,
    options?: { algo?: "aes256" | "rc4"; permissions?: number },
  ): Promise<Uint8Array>;

  export function unlockInPlace(
    document: PDFDocument,
    password: string,
  ): Promise<boolean>;
}
