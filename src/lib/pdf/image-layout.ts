export type ImagePageSize = "a4" | "letter" | "original";
export type ImageOrientation = "portrait" | "landscape";
export type ImageFitMode = "fit" | "fill" | "original";

export type ImageDimensions = {
  height: number;
  width: number;
};

export type ImageLayoutOptions = {
  fit: ImageFitMode;
  margin: number;
  orientation: ImageOrientation;
  pageSize: ImagePageSize;
};

export type ImagePlacement = {
  height: number;
  pageHeight: number;
  pageWidth: number;
  width: number;
  x: number;
  y: number;
};

const pageSizes: Record<
  Exclude<ImagePageSize, "original">,
  [number, number]
> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
const pixelsToPoints = 0.75;

export function calculateImagePlacement(
  dimensions: ImageDimensions,
  options: ImageLayoutOptions,
) {
  const baseSize: readonly [number, number] =
    options.pageSize === "original"
      ? [
          dimensions.width * pixelsToPoints + options.margin * 2,
          dimensions.height * pixelsToPoints + options.margin * 2,
        ]
      : pageSizes[options.pageSize];
  const [pageWidth, pageHeight] = applyOrientation(
    baseSize,
    options.orientation,
  );
  const availableWidth = Math.max(1, pageWidth - options.margin * 2);
  const availableHeight = Math.max(1, pageHeight - options.margin * 2);
  const imageWidth = Math.max(1, dimensions.width * pixelsToPoints);
  const imageHeight = Math.max(1, dimensions.height * pixelsToPoints);
  const scale =
    options.fit === "original"
      ? 1
      : options.fit === "fill"
        ? Math.max(availableWidth / imageWidth, availableHeight / imageHeight)
        : Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = Math.min(imageWidth * scale, availableWidth);
  const height = Math.min(imageHeight * scale, availableHeight);

  return {
    height,
    pageHeight,
    pageWidth,
    width,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
  } satisfies ImagePlacement;
}

function applyOrientation(
  size: readonly [number, number],
  orientation: ImageOrientation,
) {
  const [width, height] = size;

  if (orientation === "landscape" && height > width) {
    return [height, width] as const;
  }

  if (orientation === "portrait" && width > height) {
    return [height, width] as const;
  }

  return [width, height] as const;
}
