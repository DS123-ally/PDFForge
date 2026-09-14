import { describe, expect, it } from "vitest";

import {
  createEveryPageRanges,
  getPageNumbersFromRanges,
  PageRangeError,
  parsePageRanges,
} from "@/lib/pdf/page-ranges";

describe("parsePageRanges", () => {
  it("parses individual pages and ranges", () => {
    const ranges = parsePageRanges("1-3, 5, 7-8", 10);

    expect(ranges.map((range) => range.label)).toEqual(["1-3", "5", "7-8"]);
    expect(getPageNumbersFromRanges(ranges)).toEqual([1, 2, 3, 5, 7, 8]);
  });

  it("rejects overlapping ranges", () => {
    expect(() => parsePageRanges("1-3, 3-5", 10)).toThrow(PageRangeError);
    expect(() => parsePageRanges("1-3, 3-5", 10)).toThrow(
      "Page ranges cannot overlap.",
    );
  });

  it("rejects invalid and out-of-bounds ranges", () => {
    expect(() => parsePageRanges("3-1", 10)).toThrow(
      "Ranges must start before they end.",
    );
    expect(() => parsePageRanges("1, 12", 10)).toThrow(
      "Choose pages between 1 and 10.",
    );
  });

  it("creates a range for every page", () => {
    expect(createEveryPageRanges(3)).toEqual([
      { end: 1, label: "1", pages: [1], start: 1 },
      { end: 2, label: "2", pages: [2], start: 2 },
      { end: 3, label: "3", pages: [3], start: 3 },
    ]);
  });
});
