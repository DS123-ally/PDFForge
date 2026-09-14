import { PDFDocument } from "pdf-lib";

export async function createPdfBytes({
  pageCount = 1,
  size = [320, 420],
  sizes,
}: {
  pageCount?: number;
  size?: [number, number];
  sizes?: Array<[number, number]>;
} = {}) {
  const pdf = await PDFDocument.create();
  const pageSizes = sizes ?? Array.from({ length: pageCount }, () => size);

  for (const pageSize of pageSizes) {
    pdf.addPage(pageSize);
  }

  return pdf.save();
}

export async function createEncryptedPdfBytes() {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);

  const encryptDict = pdf.context.obj({
    Filter: "Standard",
    O: "12345678901234567890123456789012",
    P: -4,
    R: 2,
    U: "12345678901234567890123456789012",
    V: 1,
  });
  pdf.context.trailerInfo.Encrypt = pdf.context.register(encryptDict);

  return pdf.save();
}

export function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
