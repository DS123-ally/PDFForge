import type { PdfEditOptions, TextPosition } from "@/lib/pdf/edit-pdf";
import { minPasswordLength } from "@/lib/pdf/password-pdf";
import {
  defaultPrivacySanitizeOptions,
  type PrivacySanitizeOptions,
} from "@/lib/pdf/privacy-sanitize";

export const pipelineStepTypes = [
  "merge-pdf",
  "rotate-pdf",
  "add-watermark",
  "add-page-numbers",
  "add-headers-footers",
  "remove-metadata",
  "flatten-pdf",
  "sanitize-pdf",
  "password-protect-pdf",
] as const;

export type PipelineStepType = (typeof pipelineStepTypes)[number];

export type RecipeStep =
  | { id: string; type: "merge-pdf" }
  | {
      degrees: number;
      id: string;
      ranges: string;
      type: "rotate-pdf";
    }
  | {
      id: string;
      opacity: number;
      position: TextPosition;
      rotation: number;
      text: string;
      type: "add-watermark";
    }
  | {
      format: "page" | "page-of-total";
      id: string;
      position: TextPosition;
      startNumber: number;
      type: "add-page-numbers";
    }
  | {
      footerText: string;
      headerText: string;
      id: string;
      type: "add-headers-footers";
    }
  | { id: string; type: "remove-metadata" }
  | { id: string; type: "flatten-pdf" }
  | {
      id: string;
      sanitize: PrivacySanitizeOptions;
      type: "sanitize-pdf";
    }
  | {
      id: string;
      password?: string;
      type: "password-protect-pdf";
    };

export type StoredRecipe = {
  id: string;
  name: string;
  steps: RecipeStep[];
  updatedAt: string;
};

export const pipelineStepLabels: Record<PipelineStepType, string> = {
  "add-headers-footers": "Add headers and footers",
  "add-page-numbers": "Add page numbers",
  "add-watermark": "Add watermark",
  "flatten-pdf": "Flatten form fields",
  "merge-pdf": "Merge PDFs",
  "password-protect-pdf": "Password protect",
  "remove-metadata": "Strip metadata",
  "rotate-pdf": "Rotate pages",
  "sanitize-pdf": "Sanitize (privacy)",
};

export function createRecipeStep(type: PipelineStepType): RecipeStep {
  const id = createStepId();

  switch (type) {
    case "merge-pdf":
      return { id, type };
    case "rotate-pdf":
      return { degrees: 90, id, ranges: "", type };
    case "add-watermark":
      return {
        id,
        opacity: 0.25,
        position: "center",
        rotation: -35,
        text: "Confidential",
        type,
      };
    case "add-page-numbers":
      return {
        format: "page-of-total",
        id,
        position: "bottom-right",
        startNumber: 1,
        type,
      };
    case "add-headers-footers":
      return { footerText: "", headerText: "", id, type };
    case "remove-metadata":
      return { id, type };
    case "flatten-pdf":
      return { id, type };
    case "sanitize-pdf":
      return { id, sanitize: { ...defaultPrivacySanitizeOptions }, type };
    case "password-protect-pdf":
      return { id, password: "", type };
  }
}

export function validateRecipe(
  steps: readonly RecipeStep[],
  fileCount: number,
) {
  if (steps.length === 0) {
    throw new Error("Add at least one step.");
  }

  if (fileCount > 1 && steps[0]?.type !== "merge-pdf") {
    throw new Error(
      "Start with Merge PDFs when more than one file is selected.",
    );
  }

  const protectIndex = steps.findIndex(
    (step) => step.type === "password-protect-pdf",
  );

  if (protectIndex !== -1 && protectIndex !== steps.length - 1) {
    throw new Error("Password protect must be the last step.");
  }

  const protectStep = steps[protectIndex];

  if (
    protectStep?.type === "password-protect-pdf" &&
    (protectStep.password?.length ?? 0) < minPasswordLength
  ) {
    throw new Error(
      `Use a password of at least ${minPasswordLength} characters.`,
    );
  }

  const mergeLater = steps.slice(1).some((step) => step.type === "merge-pdf");

  if (mergeLater) {
    throw new Error("Merge PDFs can only be the first step.");
  }
}

export function recipeHasPasswordStep(steps: readonly RecipeStep[]) {
  return steps.some((step) => step.type === "password-protect-pdf");
}

export function stripRecipeSecrets(steps: readonly RecipeStep[]): RecipeStep[] {
  return steps.map((step) => {
    if (step.type === "password-protect-pdf") {
      return { id: step.id, type: step.type };
    }

    return structuredClone(step);
  });
}

export function toEditOptions(step: RecipeStep): PdfEditOptions | null {
  switch (step.type) {
    case "rotate-pdf":
      return {
        degrees: step.degrees,
        selection: step.ranges.trim()
          ? { mode: "custom", ranges: step.ranges }
          : { mode: "all" },
        type: "rotate",
      };
    case "add-watermark":
      return {
        opacity: step.opacity,
        position: step.position,
        rotation: step.rotation,
        text: step.text,
        type: "watermark",
      };
    case "add-page-numbers":
      return {
        format: step.format,
        position: step.position,
        startNumber: step.startNumber,
        type: "page-numbers",
      };
    case "add-headers-footers":
      return {
        footerText: step.footerText,
        headerText: step.headerText,
        type: "header-footer",
      };
    case "remove-metadata":
      return { type: "remove-metadata" };
    default:
      return null;
  }
}

function createStepId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `step-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
