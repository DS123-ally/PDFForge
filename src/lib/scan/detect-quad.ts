import {
  otsuThreshold,
  resizeImageData,
  toGrayscale,
  type Raster,
} from "@/lib/scan/image-data";
import {
  fullFrameQuad,
  quadFromExtremes,
  scaleQuad,
  type Point,
  type Quad,
} from "@/lib/scan/quad";

const detectWidth = 240;

export function detectDocumentQuad(source: Raster): Quad {
  const scale = Math.min(1, detectWidth / Math.max(1, source.width));
  const width = Math.max(8, Math.round(source.width * scale));
  const height = Math.max(8, Math.round(source.height * scale));
  const sample = scale < 1 ? resizeImageData(source, width, height) : source;
  const gray = toGrayscale(sample);
  const threshold = otsuThreshold(gray);
  const mask = new Uint8Array(gray.length);
  let brightCount = 0;

  for (let index = 0; index < gray.length; index += 1) {
    const isPaper = gray[index] >= threshold ? 1 : 0;
    mask[index] = isPaper;
    brightCount += isPaper;
  }

  if (brightCount < gray.length * 0.08 || brightCount > gray.length * 0.92) {
    return fullFrameQuad(source.width, source.height);
  }

  const blob = largestBlob(mask, width, height);

  if (!blob) {
    return fullFrameQuad(source.width, source.height);
  }

  const quad = quadFromExtremes(blob);

  if (!quad) {
    return fullFrameQuad(source.width, source.height);
  }

  return scaleQuad(quad, source.width / width, source.height / height);
}

function largestBlob(mask: Uint8Array, width: number, height: number) {
  const seen = new Uint8Array(mask.length);
  let best: Point[] | null = null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;

      if (!mask[start] || seen[start]) {
        continue;
      }

      const points = flood(mask, seen, width, height, x, y);

      if (!best || points.length > best.length) {
        best = points;
      }
    }
  }

  if (!best || best.length < width * height * 0.08) {
    return null;
  }

  return best;
}

function flood(
  mask: Uint8Array,
  seen: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
) {
  const stack = [startX, startY];
  const points: Point[] = [];

  while (stack.length > 0) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    const index = y * width + x;

    if (x < 0 || y < 0 || x >= width || y >= height || seen[index]) {
      continue;
    }

    seen[index] = 1;

    if (!mask[index]) {
      continue;
    }

    points.push({ x, y });
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  return points;
}
