export const minZoom = 0.5;
export const maxZoom = 2;
export const zoomStep = 0.25;

export function clampZoom(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(maxZoom, Math.max(minZoom, roundZoom(value)));
}

export function getNextZoom(currentZoom: number, direction: "in" | "out") {
  const nextZoom =
    direction === "in" ? currentZoom + zoomStep : currentZoom - zoomStep;

  return clampZoom(nextZoom);
}

export function getThumbnailScale(pageWidth: number, targetWidth = 112) {
  if (!Number.isFinite(pageWidth) || pageWidth <= 0) {
    return 1;
  }

  return targetWidth / pageWidth;
}

export function getCanvasPixelSize(
  width: number,
  height: number,
  devicePixelRatio = 1,
) {
  const outputScale = Math.min(Math.max(devicePixelRatio, 1), 2);

  return {
    height: Math.floor(height * outputScale),
    outputScale,
    width: Math.floor(width * outputScale),
  };
}

export function createPageRange(totalPages: number) {
  return Array.from(
    { length: Math.max(0, totalPages) },
    (_, index) => index + 1,
  );
}

export function getVisiblePageWindow(
  totalPages: number,
  selectedPage: number,
  radius = 2,
) {
  const start = Math.max(1, selectedPage - radius);
  const end = Math.min(totalPages, selectedPage + radius);

  return createPageRange(end - start + 1).map((page) => page + start - 1);
}

export function formatPageCount(totalPages: number) {
  return `${totalPages} ${totalPages === 1 ? "page" : "pages"}`;
}

function roundZoom(value: number) {
  return Math.round(value / zoomStep) * zoomStep;
}
