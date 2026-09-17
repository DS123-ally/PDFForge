import type { OcrWord } from "@/lib/scan/searchable-pdf";

const ocrAssetPaths = {
  corePath: "/ocr",
  langPath: "/ocr",
  workerPath: "/ocr/worker.min.js",
};

let workerPromise: Promise<TesseractWorker> | null = null;

type RecognizeResult = {
  data: {
    words?: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;
  };
};

type TesseractWorker = {
  recognize: (image: Blob) => Promise<RecognizeResult>;
  terminate: () => Promise<void>;
};

export async function recognizeImage(
  image: Blob,
  signal?: AbortSignal,
): Promise<OcrWord[]> {
  const worker = await getWorker();

  if (signal?.aborted) {
    throw new DOMException("OCR cancelled", "AbortError");
  }

  const result = await worker.recognize(image);

  if (signal?.aborted) {
    throw new DOMException("OCR cancelled", "AbortError");
  }

  return (result.data.words ?? [])
    .filter((word) => word.confidence >= 40 && word.text.trim())
    .map((word) => ({
      text: word.text.trim(),
      x0: word.bbox.x0,
      y0: word.bbox.y0,
      x1: word.bbox.x1,
      y1: word.bbox.y1,
    }));
}

export async function terminateOcrWorker() {
  if (!workerPromise) {
    return;
  }

  const pending = workerPromise;
  workerPromise = null;

  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // Ignore terminate races after a cancelled load.
  }
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createLocalWorker();
  }

  try {
    return await workerPromise;
  } catch (error) {
    workerPromise = null;
    throw error;
  }
}

async function createLocalWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng", 1, {
    cacheMethod: "none",
    corePath: ocrAssetPaths.corePath,
    gzip: true,
    langPath: ocrAssetPaths.langPath,
    logger: () => undefined,
    workerBlobURL: false,
    workerPath: ocrAssetPaths.workerPath,
  }) as unknown as Promise<TesseractWorker>;
}
