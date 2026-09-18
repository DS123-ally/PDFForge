import { buildDocx } from "@/lib/convert/docx";
import { buildHtml } from "@/lib/convert/html";
import { buildPptx } from "@/lib/convert/pptx";
import { readPdfConvertPages } from "@/lib/convert/read-pdf-pages";
import { buildXlsx } from "@/lib/convert/xlsx";
import { createOutputName } from "@/lib/files/create-output-name";

export const convertTargets = ["docx", "xlsx", "pptx", "html"] as const;

export type ConvertTarget = (typeof convertTargets)[number];

export const convertTargetMeta: Record<
  ConvertTarget,
  { extension: string; mime: string; suffix: string }
> = {
  docx: {
    extension: ".docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    suffix: "word",
  },
  html: {
    extension: ".html",
    mime: "text/html;charset=utf-8",
    suffix: "html",
  },
  pptx: {
    extension: ".pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    suffix: "slides",
  },
  xlsx: {
    extension: ".xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    suffix: "excel",
  },
};

export async function convertPdfDocument(
  file: File,
  options: {
    includePageImages: boolean;
    pages: readonly number[];
    scale?: number;
    target: ConvertTarget;
  },
) {
  const pages = await readPdfConvertPages(file, {
    includePageImages: options.includePageImages,
    pages: options.pages,
    scale: options.scale ?? 1.5,
  });
  const title = file.name.replace(/\.pdf$/i, "") || "document";
  const meta = convertTargetMeta[options.target];
  const bytes =
    options.target === "docx"
      ? await buildDocx(pages, title)
      : options.target === "xlsx"
        ? await buildXlsx(pages, title)
        : options.target === "pptx"
          ? await buildPptx(pages, title)
          : new TextEncoder().encode(buildHtml(pages, title));

  return {
    bytes,
    filename: createOutputName(file.name, {
      extension: meta.extension,
      suffix: meta.suffix,
    }),
    mime: meta.mime,
    pageCount: pages.length,
  };
}
