export type PiiPreset = "email" | "phone" | "id";

export type TextRun = {
  height: number;
  pageNumber: number;
  str: string;
  width: number;
  x: number;
  y: number;
};

export type PiiMatchBox = {
  height: number;
  left: number;
  pageNumber: number;
  top: number;
  width: number;
};

export type PiiMatch = {
  box: PiiMatchBox;
  kind: PiiPreset | "custom";
  text: string;
};

export type FindPiiOptions = {
  customPhrase?: string;
  presets: readonly PiiPreset[];
};

export const piiPresetLabels: Record<PiiPreset, string> = {
  email: "Email addresses",
  id: "ID-like numbers",
  phone: "Phone numbers",
};

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g;
const idPattern = /\b(?:\d{3}-\d{2}-\d{4}|[A-Z]{1,3}\d{6,}|\d{8,12})\b/g;

export function findPiiMatches(
  runs: readonly TextRun[],
  options: FindPiiOptions,
  pageSize: { height: number; width: number },
) {
  const patterns = buildPatterns(options);
  const matches: PiiMatch[] = [];

  if (patterns.length === 0) {
    return matches;
  }

  const lines = groupRunsIntoLines(runs);

  for (const line of lines) {
    const text = line.map((run) => run.str).join("");
    const offsets = charOffsets(line);

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let found: RegExpExecArray | null;

      while ((found = pattern.regex.exec(text))) {
        const start = found.index;
        const end = start + found[0].length;
        const covered = line.filter((_, index) => {
          const span = offsets[index];
          return span && span.end > start && span.start < end;
        });

        if (covered.length === 0) {
          continue;
        }

        matches.push({
          box: unionToPercentBox(covered, pageSize, line[0]?.pageNumber ?? 1),
          kind: pattern.kind,
          text: found[0],
        });
      }
    }
  }

  return matches;
}

function buildPatterns(options: FindPiiOptions) {
  const patterns: Array<{ kind: PiiPreset | "custom"; regex: RegExp }> = [];

  if (options.presets.includes("email")) {
    patterns.push({ kind: "email", regex: new RegExp(emailPattern) });
  }

  if (options.presets.includes("phone")) {
    patterns.push({ kind: "phone", regex: new RegExp(phonePattern) });
  }

  if (options.presets.includes("id")) {
    patterns.push({ kind: "id", regex: new RegExp(idPattern) });
  }

  const phrase = options.customPhrase?.trim();

  if (phrase) {
    patterns.push({
      kind: "custom",
      regex: new RegExp(escapeRegExp(phrase), "gi"),
    });
  }

  return patterns;
}

function groupRunsIntoLines(runs: readonly TextRun[]) {
  const groups = new Map<string, TextRun[]>();

  for (const run of runs) {
    if (!run.str) {
      continue;
    }

    const key = `${run.pageNumber}:${Math.round(run.y)}`;
    const group = groups.get(key) ?? [];
    group.push(run);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) =>
    [...group].sort((left, right) => left.x - right.x),
  );
}

function charOffsets(line: readonly TextRun[]) {
  let cursor = 0;

  return line.map((run) => {
    const start = cursor;
    const end = cursor + run.str.length;
    cursor = end;
    return { end, start };
  });
}

function unionToPercentBox(
  runs: readonly TextRun[],
  pageSize: { height: number; width: number },
  pageNumber: number,
) {
  const minX = Math.min(...runs.map((run) => run.x));
  const maxX = Math.max(...runs.map((run) => run.x + run.width));
  const minY = Math.min(...runs.map((run) => run.y));
  const maxY = Math.max(...runs.map((run) => run.y + run.height));
  const padX = pageSize.width * 0.004;
  const padY = pageSize.height * 0.003;
  const left = minX - padX;
  const bottom = minY - padY;
  const width = maxX - minX + padX * 2;
  const height = maxY - minY + padY * 2;

  return {
    height: (height / pageSize.height) * 100,
    left: (left / pageSize.width) * 100,
    pageNumber,
    top: ((pageSize.height - bottom - height) / pageSize.height) * 100,
    width: (width / pageSize.width) * 100,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
