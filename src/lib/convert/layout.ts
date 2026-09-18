export type LayoutRun = {
  height: number;
  str: string;
  width: number;
  x: number;
  y: number;
};

export type LayoutLine = {
  cells: string[];
  text: string;
  y: number;
};

export type ConvertPage = {
  height: number;
  lines: LayoutLine[];
  pageNumber: number;
  png?: Uint8Array;
  width: number;
};

export function groupRunsIntoLines(runs: readonly LayoutRun[]) {
  const groups = new Map<string, LayoutRun[]>();

  for (const run of runs) {
    if (!run.str) {
      continue;
    }

    const key = String(Math.round(run.y));
    const group = groups.get(key) ?? [];
    group.push(run);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => [...group].sort((left, right) => left.x - right.x))
    .sort((left, right) => (right[0]?.y ?? 0) - (left[0]?.y ?? 0))
    .map((group) => {
      const cells = splitCells(group);
      return {
        cells,
        text: cells.join(" ").replace(/\s+/g, " ").trim(),
        y: group[0]?.y ?? 0,
      } satisfies LayoutLine;
    })
    .filter((line) => line.text);
}

export function splitCells(runs: readonly LayoutRun[]) {
  if (runs.length === 0) {
    return [];
  }

  const widths = runs.map((run) => run.width).filter((width) => width > 0);
  const typical = median(widths) || 12;
  const gapLimit = Math.max(18, typical * 1.6);
  const cells: string[] = [];
  let current = runs[0]?.str ?? "";
  let previous = runs[0];

  for (const run of runs.slice(1)) {
    const gap = run.x - ((previous?.x ?? 0) + (previous?.width ?? 0));

    if (gap > gapLimit) {
      cells.push(current.trim());
      current = run.str;
    } else {
      const spacer = gap > 1.5 ? " " : "";
      current += spacer + run.str;
    }

    previous = run;
  }

  cells.push(current.trim());
  return cells.filter(Boolean);
}

export function looksLikeTable(lines: readonly LayoutLine[]) {
  const multi = lines.filter((line) => line.cells.length >= 2);
  return multi.length >= 2;
}

function median(values: readonly number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  return value ?? 0;
}
