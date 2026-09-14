import { loadPdf } from "@/lib/pdf/load-pdf";

export type PdfMetadata = {
  author: string;
  creationDate: string;
  creator: string;
  keywords: string;
  modificationDate: string;
  pageCount: number;
  producer: string;
  subject: string;
  title: string;
};

export async function readPdfMetadata(source: Blob | ArrayBuffer | Uint8Array) {
  const pdf = await loadPdf(source);

  return {
    author: pdf.getAuthor() ?? "",
    creationDate: formatDate(pdf.getCreationDate()),
    creator: pdf.getCreator() ?? "",
    keywords: pdf.getKeywords() ?? "",
    modificationDate: formatDate(pdf.getModificationDate()),
    pageCount: pdf.getPageCount(),
    producer: pdf.getProducer() ?? "",
    subject: pdf.getSubject() ?? "",
    title: pdf.getTitle() ?? "",
  } satisfies PdfMetadata;
}

function formatDate(date: Date | undefined) {
  return date ? date.toISOString() : "";
}
