import { describe, expect, it } from "vitest";

import {
  clampZoom,
  createPageRange,
  formatPageCount,
  getCanvasPixelSize,
  getNextZoom,
  getThumbnailScale,
  getVisiblePageWindow,
} from "@/lib/pdf/viewer-utils";

describe("viewer utilities", () => {
  it("clamps and steps zoom values", () => {
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(2.5)).toBe(2);
    expect(getNextZoom(1, "in")).toBe(1.25);
    expect(getNextZoom(1, "out")).toBe(0.75);
  });

  it("creates stable page ranges and selected windows", () => {
    expect(createPageRange(4)).toEqual([1, 2, 3, 4]);
    expect(getVisiblePageWindow(10, 1)).toEqual([1, 2, 3]);
    expect(getVisiblePageWindow(10, 5)).toEqual([3, 4, 5, 6, 7]);
    expect(getVisiblePageWindow(10, 10)).toEqual([8, 9, 10]);
  });

  it("calculates thumbnail and canvas output sizes", () => {
    expect(getThumbnailScale(560, 112)).toBe(0.2);
    expect(getCanvasPixelSize(100, 50, 3)).toEqual({
      height: 100,
      outputScale: 2,
      width: 200,
    });
  });

  it("formats page counts", () => {
    expect(formatPageCount(1)).toBe("1 page");
    expect(formatPageCount(2)).toBe("2 pages");
  });
});
