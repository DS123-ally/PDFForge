export type PageRange = {
  end: number;
  label: string;
  pages: number[];
  start: number;
};

export type PageRangeErrorCode =
  "empty_range" | "invalid_range" | "page_out_of_bounds" | "overlapping_range";

export class PageRangeError extends Error {
  code: PageRangeErrorCode;

  constructor(code: PageRangeErrorCode, message: string) {
    super(message);
    this.name = "PageRangeError";
    this.code = code;
  }
}

export function parsePageRanges(input: string, totalPages: number) {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new PageRangeError(
      "page_out_of_bounds",
      "This PDF does not have any pages to split.",
    );
  }

  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new PageRangeError(
      "empty_range",
      "Enter pages or ranges, for example 1-3, 5.",
    );
  }

  const seenPages = new Set<number>();
  const ranges = trimmedInput.split(",").map((part) => parsePart(part));

  for (const range of ranges) {
    if (range.start > totalPages || range.end > totalPages) {
      throw new PageRangeError(
        "page_out_of_bounds",
        `Choose pages between 1 and ${totalPages}.`,
      );
    }

    for (const page of range.pages) {
      if (seenPages.has(page)) {
        throw new PageRangeError(
          "overlapping_range",
          "Page ranges cannot overlap.",
        );
      }

      seenPages.add(page);
    }
  }

  return ranges;
}

export function getPageNumbersFromRanges(ranges: readonly PageRange[]) {
  return ranges.flatMap((range) => range.pages);
}

export function createEveryPageRanges(totalPages: number) {
  return Array.from({ length: Math.max(0, totalPages) }, (_, index) => {
    const page = index + 1;

    return {
      end: page,
      label: String(page),
      pages: [page],
      start: page,
    } satisfies PageRange;
  });
}

function parsePart(rawPart: string): PageRange {
  const part = rawPart.trim();

  if (!part) {
    throw new PageRangeError("invalid_range", "Remove empty range entries.");
  }

  const match = /^(?<start>\d+)(?:\s*-\s*(?<end>\d+))?$/.exec(part);

  if (!match?.groups) {
    throw new PageRangeError(
      "invalid_range",
      "Use page numbers or ranges like 1-3, 5.",
    );
  }

  const start = Number(match.groups.start);
  const end = Number(match.groups.end ?? match.groups.start);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < 1 ||
    start > end
  ) {
    throw new PageRangeError(
      "invalid_range",
      "Ranges must start before they end.",
    );
  }

  return {
    end,
    label: start === end ? String(start) : `${start}-${end}`,
    pages: Array.from({ length: end - start + 1 }, (_, index) => start + index),
    start,
  };
}
