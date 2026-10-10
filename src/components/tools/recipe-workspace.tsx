"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { ProcessingCard } from "@/components/tools/processing-card";
import { RedactionCheckNotice } from "@/components/tools/redaction-check-notice";
import { RecipeIntegrityTrailNotice } from "@/components/tools/recipe-integrity-trail";
import { RecipeStepFields } from "@/components/tools/recipe-step-fields";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";
import { createDownload } from "@/lib/files/create-download";
import {
  createRecipeStep,
  createSendExternallyPresetSteps,
  pipelineStepLabels,
  pipelineStepTypes,
  validateRecipe,
  type PipelineStepType,
  type RecipeStep,
} from "@/lib/recipes/recipe";
import {
  createRecipeExport,
  recipeExportFilename,
  recipeExportToJson,
} from "@/lib/recipes/recipe-export";
import {
  deleteRecipe,
  getRecipeStoreServerSnapshot,
  getRecipeStoreSnapshot,
  saveRecipe,
  setRecipeStorageOptIn,
  subscribeRecipeStore,
  type StoredRecipe,
} from "@/lib/recipes/recipe-storage";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100";

export function RecipeWorkspace() {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [addType, setAddType] = useState<PipelineStepType>("merge-pdf");
  const [recipeName, setRecipeName] = useState("Office packet");
  const [recipeId, setRecipeId] = useState(() => createLocalId());
  const [localError, setLocalError] = useState<string | null>(null);
  const recipeStore = useSyncExternalStore(
    subscribeRecipeStore,
    getRecipeStoreSnapshot,
    getRecipeStoreServerSnapshot,
  );
  const { optedIn, recipes: savedRecipes } = recipeStore;
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const isBusy = state.status === "processing";
  const canRun = files.length > 0 && steps.length > 0 && !isBusy;
  const previewFile = useMemo(
    () => files.find((file) => isPdfFile(file.file))?.file ?? null,
    [files],
  );

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      setLocalError(null);
      reset();
    },
    [reset],
  );

  function addStep() {
    setSteps((current) => [...current, createRecipeStep(addType)]);
    setLocalError(null);
  }

  function loadSendExternallyPreset() {
    setRecipeId(createLocalId());
    setRecipeName("Send externally");
    setSteps(createSendExternallyPresetSteps());
    setLocalError(null);
    reset();
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [removed] = next.splice(index, 1);
      next.splice(nextIndex, 0, removed);
      return next;
    });
  }

  function runPipeline() {
    setLocalError(null);

    try {
      validateRecipe(steps, files.length);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "This recipe cannot run.",
      );
      return;
    }

    void start(files, "recipe", { recipe: { steps } });
  }

  function persistRecipe() {
    setLocalError(null);

    try {
      const stored = saveRecipe({
        id: recipeId,
        name: recipeName,
        steps,
      });
      setRecipeId(stored.id);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "Recipe settings were not saved.",
      );
    }
  }

  function exportRecipeJson() {
    setLocalError(null);

    if (steps.length === 0) {
      setLocalError("Add at least one step before exporting a recipe.");
      return;
    }

    const exported = createRecipeExport({
      id: recipeId,
      name: recipeName.trim() || "Untitled recipe",
      steps,
    });
    const blob = new Blob([recipeExportToJson(exported)], {
      type: "application/json",
    });

    createDownload(blob, {
      filename: recipeExportFilename(exported.name),
    });
  }

  function loadRecipe(recipe: StoredRecipe) {
    setRecipeId(recipe.id);
    setRecipeName(recipe.name);
    setSteps(structuredClone(recipe.steps));
    setLocalError(null);
    reset();
  }

  function processAnother() {
    setFiles([]);
    setClearSignal((value) => value + 1);
    setLocalError(null);
    reset();
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={["pdf"]}
        allowReorder
        clearSignal={clearSignal}
        multiple
        onFilesChange={handleFilesChange}
      />

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">Recipe steps</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Drop files once, then chain tools that output a PDF. Split, images,
          extract, and redact stay as separate workspaces.
        </p>
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
          <h3 className="font-bold text-red-950">Send externally preset</h3>
          <p className="mt-2 text-sm leading-6 text-red-900">
            Loads a saved recipe that strips metadata, scans and redacts
            confirmed PII hits, flattens, watermarks, and password-protects the
            output. Add the password before running.
          </p>
          <Button
            className="mt-3"
            onClick={loadSendExternallyPreset}
            type="button"
            variant="secondary"
          >
            Load preset
          </Button>
        </div>
        {files.length > 1 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-700">
            Start with Merge PDFs when more than one file is selected.
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="block min-w-0 flex-1 text-sm font-bold">
            Step to add
            <select
              className={fieldClass}
              onChange={(event) =>
                setAddType(event.target.value as PipelineStepType)
              }
              value={addType}
            >
              {pipelineStepTypes.map((type) => (
                <option key={type} value={type}>
                  {pipelineStepLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button onClick={addStep} type="button" variant="secondary">
              Add step
            </Button>
          </div>
        </div>

        {steps.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">No steps yet.</p>
        ) : (
          <ol className="mt-5 space-y-4">
            {steps.map((step, index) => (
              <li
                className="rounded-xl border border-zinc-200 p-4"
                key={step.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold">
                    {index + 1}. {pipelineStepLabels[step.type]}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={index === 0}
                      onClick={() => moveStep(index, -1)}
                      type="button"
                      variant="ghost"
                    >
                      Move up
                    </Button>
                    <Button
                      disabled={index === steps.length - 1}
                      onClick={() => moveStep(index, 1)}
                      type="button"
                      variant="ghost"
                    >
                      Move down
                    </Button>
                    <Button
                      onClick={() =>
                        setSteps((current) =>
                          current.filter((entry) => entry.id !== step.id),
                        )
                      }
                      type="button"
                      variant="ghost"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <RecipeStepFields
                  onChange={(next) =>
                    setSteps((current) =>
                      current.map((entry) =>
                        entry.id === step.id ? next : entry,
                      ),
                    )
                  }
                  step={step}
                />
              </li>
            ))}
          </ol>
        )}

        <div className="mt-5 hidden justify-end md:flex">
          <Button disabled={!canRun} onClick={runPipeline} type="button">
            Run recipe
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">Save settings on this device</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Optional. Only step types and non-secret options are stored. PDFs,
          filenames, and passwords are never written to localStorage.
          Downloading JSON exports the same recipe settings to a local file.
        </p>
        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-bold">
          <input
            checked={optedIn}
            className="size-4 accent-red-600"
            onChange={(event) => {
              setRecipeStorageOptIn(event.target.checked);
            }}
            type="checkbox"
          />
          Save recipe settings on this device
        </label>
        <label className="mt-4 block text-sm font-bold">
          Recipe name
          <input
            className={fieldClass}
            onChange={(event) => setRecipeName(event.target.value)}
            type="text"
            value={recipeName}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            disabled={!optedIn || steps.length === 0}
            onClick={persistRecipe}
            type="button"
            variant="secondary"
          >
            Save recipe
          </Button>
          <Button
            disabled={steps.length === 0}
            onClick={exportRecipeJson}
            type="button"
            variant="secondary"
          >
            Download recipe JSON
          </Button>
        </div>
        {savedRecipes.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {savedRecipes.map((recipe) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2"
                key={recipe.id}
              >
                <span className="text-sm font-semibold">{recipe.name}</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => loadRecipe(recipe)}
                    type="button"
                    variant="ghost"
                  >
                    Load
                  </Button>
                  <Button
                    onClick={() => {
                      deleteRecipe(recipe.id);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {localError ? (
        <div className="mt-8">
          <ErrorState description={localError} title="Recipe blocked" />
        </div>
      ) : null}

      {state.status !== "idle" && state.status !== "success" ? (
        <div className="mt-8">
          <ProcessingCard onCancel={cancel} onReset={reset} state={state} />
        </div>
      ) : null}

      {state.status === "success" && state.result?.outputBytes ? (
        <div className="mt-8">
          <DownloadResultCard
            description={`${state.result.fileCount} file${state.result.fileCount === 1 ? "" : "s"} processed into ${state.result.totalPages} pages.`}
            downloadLabel="Download PDF"
            onDownload={() =>
              createDownload(
                new Blob([state.result!.outputBytes!], {
                  type: "application/pdf",
                }),
                { filename: state.result?.filename ?? "recipe.pdf" },
              )
            }
            onProcessAnother={processAnother}
            title="Your recipe PDF is ready"
          >
            {state.result.redactionCheck ? (
              <RedactionCheckNotice result={state.result.redactionCheck} />
            ) : null}
            {state.result.integrityTrail ? (
              <RecipeIntegrityTrailNotice trail={state.result.integrityTrail} />
            ) : null}
          </DownloadResultCard>
        </div>
      ) : null}

      {previewFile ? <PdfViewer file={previewFile} /> : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canRun}
        label="Run recipe"
        onClick={runPipeline}
      />
    </div>
  );
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `recipe-${Date.now()}`;
}
