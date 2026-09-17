import { applyHomography, computeHomography } from "@/lib/scan/homography";
import { createRaster, type Raster } from "@/lib/scan/image-data";
import { outputSizeForQuad, type Quad } from "@/lib/scan/quad";

export function warpImageData(source: Raster, quad: Quad, maxEdge = 1600) {
  const size = outputSizeForQuad(quad, maxEdge);
  const destination: Quad = [
    { x: 0, y: 0 },
    { x: size.width - 1, y: 0 },
    { x: size.width - 1, y: size.height - 1 },
    { x: 0, y: size.height - 1 },
  ];
  const inverse = computeHomography(destination, quad);
  const output = createRaster(size.width, size.height);

  for (let y = 0; y < size.height; y += 1) {
    for (let x = 0; x < size.width; x += 1) {
      const sourcePoint = applyHomography(inverse, x, y);
      const pixel = sampleBilinear(source, sourcePoint.x, sourcePoint.y);
      const index = (y * size.width + x) * 4;
      output.data[index] = pixel[0];
      output.data[index + 1] = pixel[1];
      output.data[index + 2] = pixel[2];
      output.data[index + 3] = 255;
    }
  }

  return output;
}

function sampleBilinear(source: Raster, x: number, y: number) {
  if (x < 0 || y < 0 || x >= source.width - 1 || y >= source.height - 1) {
    return [255, 255, 255] as const;
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = x - x0;
  const ty = y - y0;
  const topLeft = pixel(source, x0, y0);
  const topRight = pixel(source, x1, y0);
  const bottomLeft = pixel(source, x0, y1);
  const bottomRight = pixel(source, x1, y1);

  return [
    lerp(
      lerp(topLeft[0], topRight[0], tx),
      lerp(bottomLeft[0], bottomRight[0], tx),
      ty,
    ),
    lerp(
      lerp(topLeft[1], topRight[1], tx),
      lerp(bottomLeft[1], bottomRight[1], tx),
      ty,
    ),
    lerp(
      lerp(topLeft[2], topRight[2], tx),
      lerp(bottomLeft[2], bottomRight[2], tx),
      ty,
    ),
  ] as const;
}

function pixel(source: Raster, x: number, y: number) {
  const index = (y * source.width + x) * 4;
  return [
    source.data[index],
    source.data[index + 1],
    source.data[index + 2],
  ] as const;
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}
