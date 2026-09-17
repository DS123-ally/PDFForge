import type { TextPosition } from "@/lib/pdf/edit-pdf";
import type { PrivacySanitizeOptions } from "@/lib/pdf/privacy-sanitize";
import { minPasswordLength } from "@/lib/pdf/password-pdf";
import type { RecipeStep } from "@/lib/recipes/recipe";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100";

const positions: TextPosition[] = [
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export function RecipeStepFields({
  onChange,
  step,
}: {
  onChange: (step: RecipeStep) => void;
  step: RecipeStep;
}) {
  if (step.type === "merge-pdf") {
    return (
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Combines every selected PDF in list order. Use this as the first step
        when more than one file is dropped.
      </p>
    );
  }

  if (step.type === "rotate-pdf") {
    return (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Degrees
          <select
            className={fieldClass}
            onChange={(event) =>
              onChange({ ...step, degrees: Number(event.target.value) })
            }
            value={step.degrees}
          >
            <option value={90}>90</option>
            <option value={180}>180</option>
            <option value={270}>270</option>
          </select>
        </label>
        <label className="block text-sm font-bold">
          Pages
          <input
            className={fieldClass}
            onChange={(event) =>
              onChange({ ...step, ranges: event.target.value })
            }
            placeholder="All pages, or 1-3, 5"
            type="text"
            value={step.ranges}
          />
        </label>
      </div>
    );
  }

  if (step.type === "add-watermark") {
    return (
      <div className="mt-3 grid gap-3">
        <label className="block text-sm font-bold">
          Watermark text
          <input
            className={fieldClass}
            onChange={(event) =>
              onChange({ ...step, text: event.target.value })
            }
            type="text"
            value={step.text}
          />
        </label>
        <PositionField
          onChange={(position) => onChange({ ...step, position })}
          value={step.position}
        />
        <label className="block text-sm font-bold">
          Opacity: {Math.round(step.opacity * 100)}%
          <input
            className="mt-3 w-full accent-red-600"
            max={1}
            min={0.05}
            onChange={(event) =>
              onChange({ ...step, opacity: Number(event.target.value) })
            }
            step={0.05}
            type="range"
            value={step.opacity}
          />
        </label>
      </div>
    );
  }

  if (step.type === "add-page-numbers") {
    return (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PositionField
          onChange={(position) => onChange({ ...step, position })}
          value={step.position}
        />
        <label className="block text-sm font-bold">
          Format
          <select
            className={fieldClass}
            onChange={(event) =>
              onChange({
                ...step,
                format: event.target.value as "page" | "page-of-total",
              })
            }
            value={step.format}
          >
            <option value="page-of-total">Page of total</option>
            <option value="page">Page only</option>
          </select>
        </label>
      </div>
    );
  }

  if (step.type === "add-headers-footers") {
    return (
      <div className="mt-3 grid gap-3">
        <label className="block text-sm font-bold">
          Header
          <input
            className={fieldClass}
            onChange={(event) =>
              onChange({ ...step, headerText: event.target.value })
            }
            type="text"
            value={step.headerText}
          />
        </label>
        <label className="block text-sm font-bold">
          Footer
          <input
            className={fieldClass}
            onChange={(event) =>
              onChange({ ...step, footerText: event.target.value })
            }
            type="text"
            value={step.footerText}
          />
        </label>
      </div>
    );
  }

  if (step.type === "remove-metadata" || step.type === "flatten-pdf") {
    return (
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        {step.type === "remove-metadata"
          ? "Clears common document properties. Visible page content is not removed."
          : "Burns AcroForm fields into the page. Put this before password protect."}
      </p>
    );
  }

  if (step.type === "sanitize-pdf") {
    return (
      <ul className="mt-3 space-y-2">
        {(
          [
            ["stripMetadata", "Strip metadata"],
            ["dropAttachments", "Drop attachments"],
            ["dropJavascript", "Drop JavaScript"],
            ["stripFormValues", "Clear form values"],
            ["flattenForms", "Flatten forms"],
            ["stripImageExif", "Strip JPEG EXIF"],
          ] as Array<[keyof PrivacySanitizeOptions, string]>
        ).map(([key, label]) => (
          <li key={key}>
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
              <input
                checked={step.sanitize[key]}
                className="size-4 accent-red-600"
                onChange={(event) =>
                  onChange({
                    ...step,
                    sanitize: {
                      ...step.sanitize,
                      [key]: event.target.checked,
                    },
                  })
                }
                type="checkbox"
              />
              {label}
            </label>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <label className="mt-3 block text-sm font-bold">
      Password (never saved)
      <input
        autoComplete="new-password"
        className={fieldClass}
        minLength={minPasswordLength}
        onChange={(event) =>
          onChange({ ...step, password: event.target.value })
        }
        placeholder={`At least ${minPasswordLength} characters`}
        type="password"
        value={step.password ?? ""}
      />
    </label>
  );
}

function PositionField({
  onChange,
  value,
}: {
  onChange: (value: TextPosition) => void;
  value: TextPosition;
}) {
  return (
    <label className="block text-sm font-bold">
      Position
      <select
        className={fieldClass}
        onChange={(event) => onChange(event.target.value as TextPosition)}
        value={value}
      >
        {positions.map((position) => (
          <option key={position} value={position}>
            {position.replace("-", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
