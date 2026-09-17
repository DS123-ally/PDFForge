import { imageDataToPngBlob, rasterToImageData } from "@/lib/scan/canvas";
import { clampQuad, type Quad } from "@/lib/scan/quad";
import type { Raster } from "@/lib/scan/image-data";
import { warpImageData } from "@/lib/scan/warp";

export async function flattenScannedPage(image: Raster, quad: Quad) {
  const warped = warpImageData(
    image,
    clampQuad(quad, image.width, image.height),
  );
  const blob = await imageDataToPngBlob(rasterToImageData(warped));

  return {
    blob,
    height: warped.height,
    width: warped.width,
  };
}
