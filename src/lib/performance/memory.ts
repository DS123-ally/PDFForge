export const largeFileWarningBytes = 75 * 1024 * 1024;
export const lowMemorySelectionBytes = 25 * 1024 * 1024;

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    jsHeapSizeLimit: number;
    usedJSHeapSize: number;
  };
};

export function getDeviceMemoryGb() {
  if (typeof navigator === "undefined") {
    return null;
  }

  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  return typeof memory === "number" && memory > 0 ? memory : null;
}

export function isLowMemoryDevice() {
  const deviceMemory = getDeviceMemoryGb();
  return deviceMemory !== null && deviceMemory <= 4;
}

export function getHeapPressureRatio() {
  if (typeof performance === "undefined") {
    return null;
  }

  const memory = (performance as PerformanceWithMemory).memory;

  if (!memory || memory.jsHeapSizeLimit <= 0) {
    return null;
  }

  return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
}

export function shouldWarnForSelection(totalSelectedBytes: number) {
  if (totalSelectedBytes >= largeFileWarningBytes) {
    return true;
  }

  if (totalSelectedBytes < lowMemorySelectionBytes) {
    return false;
  }

  const heapRatio = getHeapPressureRatio();

  if (heapRatio !== null && heapRatio >= 0.25) {
    return true;
  }

  return isLowMemoryDevice();
}

export function getPreviewScaleFactor() {
  return isLowMemoryDevice() ? 0.75 : 1;
}

export function getMaxConcurrentThumbnails() {
  return isLowMemoryDevice() ? 2 : 4;
}

export function getCanvasPixelCap() {
  return isLowMemoryDevice() ? 1 : 2;
}

export function getMemoryWarningMessage(totalSelectedBytes: number) {
  if (!shouldWarnForSelection(totalSelectedBytes)) {
    return null;
  }

  if (totalSelectedBytes >= largeFileWarningBytes) {
    return "This selection is large. Keep this tab open while PDFForge works locally, and close other heavy tabs if the browser slows down.";
  }

  return "This device may have limited memory. Close other heavy tabs before processing these files locally.";
}
