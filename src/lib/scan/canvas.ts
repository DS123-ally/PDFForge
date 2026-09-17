import type { Raster } from "@/lib/scan/image-data";

type RasterContext = CanvasRenderingContext2D;

export function rasterToImageData(source: Raster) {
  const data = new Uint8ClampedArray(source.data.length);
  data.set(source.data);
  return new ImageData(data, source.width, source.height);
}

export async function blobToImageData(blob: Blob) {
  try {
    if ("createImageBitmap" in globalThis) {
      const bitmap = await createImageBitmap(blob);

      try {
        return drawToImageData(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    }
  } catch {
    // Some browsers fail createImageBitmap on small PNGs; use an img element.
  }

  const url = URL.createObjectURL(blob);

  try {
    const image = await loadHtmlImage(url);
    return drawToImageData(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imageDataToPngBlob(image: ImageData) {
  const canvas = createHtmlCanvas(image.width, image.height);
  const context = get2dContext(canvas);

  if (!context) {
    throw new Error("This browser could not encode the scanned page.");
  }

  context.putImageData(image, 0, 0);
  return canvasToBlob(canvas, "image/png");
}

export function videoFrameToImageData(video: HTMLVideoElement, maxEdge = 1600) {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    throw new Error("The camera frame is not ready yet.");
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = createHtmlCanvas(targetWidth, targetHeight);
  const context = get2dContext(canvas);

  if (!context) {
    throw new Error("This browser could not capture a camera frame.");
  }

  context.drawImage(video, 0, 0, targetWidth, targetHeight);
  return context.getImageData(0, 0, targetWidth, targetHeight);
}

function drawToImageData(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = createHtmlCanvas(width, height);
  const context = get2dContext(canvas);

  if (!context) {
    throw new Error("This browser could not read the image.");
  }

  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function createHtmlCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return canvas;
}

function get2dContext(canvas: HTMLCanvasElement) {
  return canvas.getContext("2d", {
    willReadFrequently: true,
  }) as RasterContext | null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("This browser could not encode the scanned page."));
    }, type);
  });
}

function loadHtmlImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be read."));
    image.src = url;
  });
}
