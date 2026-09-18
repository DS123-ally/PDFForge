import { pdfToImages } from "@/lib/pdf/pdf-to-images";
import { getPdfJs } from "@/lib/pdf/pdfjs";
import {
  groupRunsIntoLines,
  type ConvertPage,
  type LayoutRun,
} from "@/lib/convert/layout";

export async function readPdfConvertPages(
  file: File,
  options: {
    includePageImages: boolean;
    pages: readonly number[];
    scale: number;
  },
) {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
    useWorkerFetch: false,
  });

  try {
    const document = await loadingTask.promise;
    const pages: ConvertPage[] = [];

    for (const pageNumber of options.pages) {
      if (pageNumber < 1 || pageNumber > document.numPages) {
        throw new Error(`Choose pages between 1 and ${document.numPages}.`);
      }

      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const runs = content.items.flatMap((item) => {
        if (!("str" in item) || !item.str || !("transform" in item)) {
          return [];
        }

        const width = "width" in item ? Number(item.width) : 0;
        const height = "height" in item ? Number(item.height) : 8;

        return [
          {
            height,
            str: item.str,
            width: width || height,
            x: item.transform[4],
            y: item.transform[5],
          } satisfies LayoutRun,
        ];
      });

      pages.push({
        height: viewport.height,
        lines: groupRunsIntoLines(runs),
        pageNumber,
        width: viewport.width,
      });
      page.cleanup();
    }

    await document.cleanup();

    if (!options.includePageImages) {
      return pages;
    }

    const images = await pdfToImages(file, {
      format: "png",
      pages: options.pages,
      quality: 0.92,
      scale: options.scale,
      sourceName: file.name,
    });

    return Promise.all(
      pages.map(async (page) => {
        const image = images.find(
          (item) => item.pageNumber === page.pageNumber,
        );

        return {
          ...page,
          png: image
            ? new Uint8Array(await image.bytes.arrayBuffer())
            : undefined,
        };
      }),
    );
  } finally {
    await loadingTask.destroy();
  }
}
