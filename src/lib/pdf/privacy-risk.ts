import type { PDFDocumentProxy } from "pdfjs-dist";

import type { PiiMatchBox, TextRun } from "@/lib/pdf/find-pii";
import {
  auditPdfPrivacy,
  type PrivacyAuditReport,
} from "@/lib/pdf/privacy-audit";

export const privacyRiskKinds = [
  "aadhaar",
  "pan",
  "card",
  "bank",
  "passport",
  "email",
  "phone",
  "ifsc",
  "gst",
  "metadata",
  "url",
  "hidden-text",
  "dob",
] as const;

export type PrivacyRiskKind = (typeof privacyRiskKinds)[number];

export type PrivacyRiskMatch = {
  box: PiiMatchBox;
  kind: Extract<
    PrivacyRiskKind,
    | "aadhaar"
    | "pan"
    | "card"
    | "bank"
    | "passport"
    | "email"
    | "phone"
    | "ifsc"
    | "gst"
    | "url"
    | "dob"
  >;
  text: string;
};

export type PrivacyRiskNote = {
  kind: Extract<PrivacyRiskKind, "metadata" | "hidden-text" | "url">;
  samples: string[];
  title: string;
};

export type PrivacyRiskReport = {
  audit: PrivacyAuditReport;
  hiddenTextPages: number[];
  matches: PrivacyRiskMatch[];
  notes: PrivacyRiskNote[];
};

export const privacyRiskLabels: Record<PrivacyRiskKind, string> = {
  aadhaar: "Aadhaar Number",
  bank: "Bank Account",
  card: "Credit / Debit Card",
  dob: "Date of Birth",
  email: "Email Address",
  gst: "IFSC & GST Codes",
  "hidden-text": "Invisible Text Layers",
  ifsc: "IFSC & GST Codes",
  metadata: "Hidden Metadata",
  pan: "PAN Number",
  passport: "Passport Number",
  phone: "Phone Number",
  url: "Embedded URLs & IPs",
};

export const privacyRiskChips: Array<{
  kind: PrivacyRiskKind;
  label: string;
}> = [
  { kind: "aadhaar", label: "Aadhaar Number" },
  { kind: "pan", label: "PAN Number" },
  { kind: "card", label: "Credit / Debit Card" },
  { kind: "bank", label: "Bank Account" },
  { kind: "passport", label: "Passport Number" },
  { kind: "email", label: "Email Address" },
  { kind: "phone", label: "Phone Number" },
  { kind: "ifsc", label: "IFSC & GST Codes" },
  { kind: "metadata", label: "Hidden Metadata" },
  { kind: "url", label: "Embedded URLs & IPs" },
  { kind: "hidden-text", label: "Invisible Text Layers" },
  { kind: "dob", label: "Date of Birth" },
];

type InternalMatch = PrivacyRiskMatch & { end: number; start: number };

const detectors: Array<{
  kind: PrivacyRiskMatch["kind"];
  regex: RegExp;
  accept?: (value: string, line: string) => boolean;
}> = [
  {
    kind: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    kind: "url",
    regex:
      /\b(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))\b/gi,
  },
  {
    accept: (value) =>
      /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.toUpperCase()),
    kind: "gst",
    regex: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/gi,
  },
  {
    accept: (value) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.toUpperCase()),
    kind: "pan",
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi,
  },
  {
    accept: (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase()),
    kind: "ifsc",
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi,
  },
  {
    accept: isValidAadhaar,
    kind: "aadhaar",
    regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  },
  {
    accept: isValidCardNumber,
    kind: "card",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
  },
  {
    accept: (value, line) =>
      /passport/i.test(line) || /^[A-PR-WY][1-9]\d{6}$/.test(value.toUpperCase()),
    kind: "passport",
    regex: /\b[A-PR-WY][1-9]\d{6}\b/gi,
  },
  {
    kind: "dob",
    regex:
      /\b(?:(?:0?[1-9]|[12]\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|(?:19|20)\d{2}[/-](?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])|(?:0?[1-9]|[12]\d|3[01])\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s(?:19|20)\d{2})\b/gi,
  },
  {
    accept: (value, line) => {
      const compact = value.replace(/\s+/g, "").toUpperCase();

      if (/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(compact)) {
        return true;
      }

      const index = line.indexOf(value);
      const window = line.slice(Math.max(0, index - 28), index + value.length);
      return (
        /(?:a\/c|account|acct|beneficiary|bank)/i.test(window) &&
        digitsOnly(value).length >= 9
      );
    },
    kind: "bank",
    regex: /\b(?:[A-Z]{2}\d{2}[A-Z0-9]{10,30}|\d{9,18})\b/gi,
  },
  {
    kind: "phone",
    regex:
      /(?:\+91[\s-]?)?[6-9]\d(?:[\s-]?\d){8}\b|(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g,
  },
];

export function findPrivacyRiskMatches(
  runs: readonly TextRun[],
  pageSize: { height: number; width: number },
) {
  const matches: PrivacyRiskMatch[] = [];

  for (const line of groupRunsIntoLines(runs)) {
    const text = line.map((run) => run.str).join("");
    const offsets = charOffsets(line);
    const accepted: InternalMatch[] = [];

    for (const detector of detectors) {
      const regex = new RegExp(detector.regex.source, detector.regex.flags);
      let found: RegExpExecArray | null;

      while ((found = regex.exec(text))) {
        const value = found[0];
        const start = found.index;
        const end = start + value.length;

        if (detector.accept && !detector.accept(value, text)) {
          continue;
        }

        if (accepted.some((match) => rangesOverlap(match.start, match.end, start, end))) {
          continue;
        }

        const covered = line.filter((_, index) => {
          const span = offsets[index];
          return span && span.end > start && span.start < end;
        });

        if (covered.length === 0) {
          continue;
        }

        accepted.push({
          box: unionToPercentBox(covered, pageSize, line[0]?.pageNumber ?? 1),
          end,
          kind: detector.kind,
          start,
          text: value.trim(),
        });
      }
    }

    matches.push(
      ...accepted.map(({ box, kind, text }) => ({ box, kind, text })),
    );
  }

  return matches;
}

export async function scanPrivacyRisk(
  source: ArrayBuffer | Uint8Array,
  document: PDFDocumentProxy,
) {
  const matches: PrivacyRiskMatch[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const runs = content.items.flatMap((item) => {
      if (!("str" in item) || !item.str || !("transform" in item)) {
        return [];
      }

      const transform = item.transform;
      const width = "width" in item ? Number(item.width) : 0;
      const height = "height" in item ? Number(item.height) : 8;

      return [
        {
          height,
          pageNumber,
          str: item.str,
          width: width || height,
          x: transform[4],
          y: transform[5],
        } satisfies TextRun,
      ];
    });

    matches.push(
      ...findPrivacyRiskMatches(runs, {
        height: viewport.height,
        width: viewport.width,
      }),
    );
    page.cleanup();
  }

  const audit = await auditPdfPrivacy(source);
  const notes: PrivacyRiskNote[] = [];
  const metadataSamples = audit.findings
    .filter((finding) =>
      ["metadata", "xmp", "attachments", "javascript", "forms", "exif"].includes(
        finding.category,
      ),
    )
    .flatMap((finding) => finding.samples)
    .filter(Boolean);

  if (metadataSamples.length > 0 || audit.xmpPresent) {
    notes.push({
      kind: "metadata",
      samples: metadataSamples.slice(0, 12),
      title: "Hidden metadata and attachments",
    });
  }

  if (audit.hiddenTextCount > 0) {
    const hiddenFinding = audit.findings.find(
      (finding) => finding.category === "hidden-text",
    );
    notes.push({
      kind: "hidden-text",
      samples: hiddenFinding?.samples ?? [`${audit.hiddenTextCount} hidden items`],
      title: "Invisible or off-page text",
    });
  }

  const urlMatches = matches.filter((match) => match.kind === "url");
  if (urlMatches.length > 0) {
    notes.push({
      kind: "url",
      samples: urlMatches.slice(0, 8).map((match) => match.text),
      title: "Embedded URLs and IP addresses",
    });
  }

  return {
    audit,
    hiddenTextPages: uniquePageNumbers(audit.findings.flatMap((finding) =>
      finding.category === "hidden-text" ? finding.samples : [],
    )),
    matches,
    notes,
  } satisfies PrivacyRiskReport;
}

export function countByRiskKind(report: PrivacyRiskReport) {
  const counts = Object.fromEntries(
    privacyRiskKinds.map((kind) => [kind, 0]),
  ) as Record<PrivacyRiskKind, number>;

  for (const match of report.matches) {
    counts[match.kind] += 1;

    if (match.kind === "gst") {
      counts.ifsc += 1;
    }
  }

  for (const note of report.notes) {
    if (note.kind === "url") {
      continue;
    }

    counts[note.kind] += note.samples.length || 1;
  }

  return counts;
}

export function isValidAadhaar(value: string) {
  const digits = digitsOnly(value);

  if (!/^[2-9]\d{11}$/.test(digits)) {
    return false;
  }

  return verhoeffValid(digits);
}

export function isValidCardNumber(value: string) {
  const digits = digitsOnly(value);

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  return luhnValid(digits);
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
): PiiMatchBox {
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

function rangesOverlap(leftStart: number, leftEnd: number, rightStart: number, rightEnd: number) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function luhnValid(digits: string) {
  let sum = 0;
  let alternate = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

const verhoeffD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const verhoeffP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function verhoeffValid(digits: string) {
  let checksum = 0;
  const reversed = digits.split("").reverse().map(Number);

  for (let index = 0; index < reversed.length; index += 1) {
    checksum = verhoeffD[checksum]![verhoeffP[index % 8]![reversed[index]!]!]!;
  }

  return checksum === 0;
}

function uniquePageNumbers(samples: readonly string[]) {
  const pages = new Set<number>();

  for (const sample of samples) {
    const match = sample.match(/Page (\d+)/i);
    if (match) {
      pages.add(Number(match[1]));
    }
  }

  return [...pages];
}
