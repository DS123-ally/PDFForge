"use client";

import { Copy } from "lucide-react";
import { useCallback, useState } from "react";

import {
  FileUploader,
  type LocalUploadedFile,
} from "@/components/pdf/file-uploader";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { ProcessingCard } from "@/components/tools/processing-card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import type { ToolDefinition } from "@/config/tools";
import { createDownload } from "@/lib/files/create-download";
import type {
  PdfEditOptions,
  PdfPageSelection,
  TextPosition,
} from "@/lib/pdf/edit-pdf";
import { extractTextFromPdf } from "@/lib/pdf/extract-text";
import { readPdfMetadata, type PdfMetadata } from "@/lib/pdf/metadata";
import { usePdfWorkerProcessor } from "@/hooks/use-pdf-worker-processor";

type LocalStatus = "idle" | "processing" | "success" | "error";

export function EditPrivacyWorkspace({ tool }: { tool: ToolDefinition }) {
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [ranges, setRanges] = useState("");
  const [rotation, setRotation] = useState(90);
  const [watermarkText, setWatermarkText] = useState("Confidential");
  const [opacity, setOpacity] = useState(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(-35);
  const [position, setPosition] = useState<TextPosition>("center");
  const [startNumber, setStartNumber] = useState(1);
  const [numberFormat, setNumberFormat] = useState<"page" | "page-of-total">(
    "page",
  );
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [localStatus, setLocalStatus] = useState<LocalStatus>("idle");
  const [localMessage, setLocalMessage] = useState("Ready");
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const { cancel, reset, start, state } = usePdfWorkerProcessor();
  const selectedFile = files[0];
  const isBusy = state.status === "processing" || localStatus === "processing";
  const canRun = Boolean(selectedFile && !isBusy);

  const handleFilesChange = useCallback(
    (nextFiles: LocalUploadedFile[]) => {
      setFiles(nextFiles);
      setMetadata(null);
      setExtractedText("");
      setLocalStatus("idle");
      setLocalMessage("Ready");
      reset();
    },
    [reset],
  );

  async function runTool() {
    if (!selectedFile) {
      return;
    }

    if (tool.slug === "view-metadata") {
      await viewMetadata(selectedFile);
      return;
    }

    if (tool.slug === "extract-text") {
      await extractText(selectedFile);
      return;
    }

    const editOptions = getEditOptions();

    if (!editOptions) {
      return;
    }

    void start([selectedFile], "edit-pdf", { editPdf: editOptions });
  }

  async function viewMetadata(file: LocalUploadedFile) {
    setLocalStatus("processing");
    setLocalMessage("Reading metadata locally");

    try {
      setMetadata(await readPdfMetadata(file.file));
      setLocalStatus("success");
      setLocalMessage("Metadata is ready.");
    } catch {
      setLocalStatus("error");
      setLocalMessage("PDFForge could not read this PDF metadata.");
    }
  }

  async function extractText(file: LocalUploadedFile) {
    setLocalStatus("processing");
    setLocalMessage("Extracting text locally");

    try {
      const text = await extractTextFromPdf(file.file, {
        ranges: ranges.trim() || undefined,
      });
      setExtractedText(text || "No selectable text was found in these pages.");
      setLocalStatus("success");
      setLocalMessage("Text extraction is ready.");
    } catch (error) {
      setLocalStatus("error");
      setLocalMessage(
        error instanceof Error
          ? error.message
          : "PDFForge could not extract text from this PDF.",
      );
    }
  }

  function getEditOptions(): PdfEditOptions | null {
    const selection = getSelection();

    switch (tool.slug) {
      case "rotate-pdf":
        return { degrees: rotation, selection, type: "rotate" };
      case "add-watermark":
        return {
          opacity,
          position,
          rotation: watermarkRotation,
          text: watermarkText,
          type: "watermark",
        };
      case "add-page-numbers":
        return {
          format: numberFormat,
          position,
          startNumber,
          type: "page-numbers",
        };
      case "add-headers-footers":
        return { footerText, headerText, type: "header-footer" };
      case "remove-metadata":
        return { type: "remove-metadata" };
      default:
        return null;
    }
  }

  function getSelection(): PdfPageSelection {
    return selectionMode === "custom"
      ? { mode: "custom", ranges }
      : { mode: "all" };
  }

  function downloadEditedPdf() {
    if (!state.result?.outputBytes) {
      return;
    }

    createDownload(
      new Blob([state.result.outputBytes], { type: "application/pdf" }),
      {
        filename: state.result.filename,
      },
    );
  }

  function downloadText() {
    createDownload(new Blob([extractedText], { type: "text/plain" }), {
      filename: `${selectedFile?.file.name.replace(/\.pdf$/i, "") || "document"}-text.txt`,
    });
  }

  async function copyText() {
    await navigator.clipboard?.writeText(extractedText);
  }

  function processAnother() {
    reset();
    setMetadata(null);
    setExtractedText("");
    setLocalStatus("idle");
    setRanges("");
    setClearSignal((signal) => signal + 1);
  }

  return (
    <div className="pb-24 md:pb-0">
      <FileUploader
        acceptedTypes={["pdf"]}
        clearSignal={clearSignal}
        multiple={false}
        onFilesChange={handleFilesChange}
      />

      {selectedFile ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Tool settings</h2>
          <PhaseNineSettings
            footerText={footerText}
            headerText={headerText}
            numberFormat={numberFormat}
            opacity={opacity}
            position={position}
            ranges={ranges}
            rotation={rotation}
            selectionMode={selectionMode}
            setFooterText={setFooterText}
            setHeaderText={setHeaderText}
            setNumberFormat={setNumberFormat}
            setOpacity={setOpacity}
            setPosition={setPosition}
            setRanges={setRanges}
            setRotation={setRotation}
            setSelectionMode={setSelectionMode}
            setStartNumber={setStartNumber}
            setWatermarkRotation={setWatermarkRotation}
            setWatermarkText={setWatermarkText}
            startNumber={startNumber}
            toolSlug={tool.slug}
            watermarkRotation={watermarkRotation}
            watermarkText={watermarkText}
          />
          <div className="mt-5 hidden justify-end md:flex">
            <Button disabled={!canRun} onClick={runTool} type="button">
              {getActionLabel(tool.slug)}
            </Button>
          </div>
        </section>
      ) : null}

      {state.status !== "idle" && state.status !== "success" ? (
        <div className="mt-8">
          <ProcessingCard onCancel={cancel} onReset={reset} state={state} />
        </div>
      ) : null}

      {state.status === "success" && state.result?.outputBytes ? (
        <div className="mt-8">
          <DownloadResultCard
            description={`${state.result.totalPages} pages processed locally.`}
            downloadLabel="Download PDF"
            onDownload={downloadEditedPdf}
            onProcessAnother={processAnother}
            title="Your PDF is ready"
          />
        </div>
      ) : null}

      {localStatus === "processing" ? (
        <p
          className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-700"
          role="status"
        >
          {localMessage}
        </p>
      ) : null}

      {localStatus === "error" ? (
        <div className="mt-8">
          <ErrorState description={localMessage} title="Tool failed" />
        </div>
      ) : null}

      {metadata ? <MetadataResult metadata={metadata} /> : null}
      {extractedText ? (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Extracted text</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Text extraction reads selectable text only. Scanned pages need OCR
            in a later phase.
          </p>
          <textarea
            className="mt-4 min-h-64 w-full rounded-xl border border-zinc-300 p-3 text-sm"
            readOnly
            value={extractedText}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={copyText} type="button" variant="secondary">
              <Copy aria-hidden="true" className="size-4" />
              Copy text
            </Button>
            <Button onClick={downloadText} type="button">
              Download text
            </Button>
            <Button onClick={processAnother} type="button" variant="secondary">
              Process another
            </Button>
          </div>
        </section>
      ) : null}

      {selectedFile ? <PdfViewer file={selectedFile.file} /> : null}
      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canRun}
        label={getActionLabel(tool.slug)}
        onClick={runTool}
      />
    </div>
  );
}

type SettingsProps = {
  footerText: string;
  headerText: string;
  numberFormat: "page" | "page-of-total";
  opacity: number;
  position: TextPosition;
  ranges: string;
  rotation: number;
  selectionMode: "all" | "custom";
  setFooterText: (value: string) => void;
  setHeaderText: (value: string) => void;
  setNumberFormat: (value: "page" | "page-of-total") => void;
  setOpacity: (value: number) => void;
  setPosition: (value: TextPosition) => void;
  setRanges: (value: string) => void;
  setRotation: (value: number) => void;
  setSelectionMode: (value: "all" | "custom") => void;
  setStartNumber: (value: number) => void;
  setWatermarkRotation: (value: number) => void;
  setWatermarkText: (value: string) => void;
  startNumber: number;
  toolSlug: string;
  watermarkRotation: number;
  watermarkText: string;
};

function PhaseNineSettings(props: SettingsProps) {
  if (
    props.toolSlug === "view-metadata" ||
    props.toolSlug === "remove-metadata"
  ) {
    return (
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        Common PDF metadata fields will be read locally. Metadata cleaning does
        not remove visible document content.
      </p>
    );
  }

  if (props.toolSlug === "extract-text") {
    return (
      <label className="mt-4 block text-sm font-bold text-zinc-950">
        Pages to extract
        <input
          className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
          onChange={(event) => props.setRanges(event.target.value)}
          placeholder="Leave blank for all pages, or use 1-3, 5"
          type="text"
          value={props.ranges}
        />
      </label>
    );
  }

  return (
    <div className="mt-4 grid gap-4">
      {props.toolSlug === "rotate-pdf" ? (
        <>
          <PageSelectionControls
            ranges={props.ranges}
            selectionMode={props.selectionMode}
            setRanges={props.setRanges}
            setSelectionMode={props.setSelectionMode}
          />
          <label className="block text-sm font-bold text-zinc-950">
            Rotation
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
              onChange={(event) =>
                props.setRotation(Number(event.target.value))
              }
              value={props.rotation}
            >
              <option value={90}>90 degrees</option>
              <option value={180}>180 degrees</option>
              <option value={270}>270 degrees</option>
            </select>
          </label>
        </>
      ) : null}

      {props.toolSlug === "add-watermark" ? (
        <>
          <TextInput
            label="Watermark text"
            onChange={props.setWatermarkText}
            value={props.watermarkText}
          />
          <PositionSelect onChange={props.setPosition} value={props.position} />
          <label className="block text-sm font-bold text-zinc-950">
            Opacity: {Math.round(props.opacity * 100)}%
            <input
              className="mt-3 w-full accent-red-600"
              max={1}
              min={0.05}
              onChange={(event) => props.setOpacity(Number(event.target.value))}
              step={0.05}
              type="range"
              value={props.opacity}
            />
          </label>
          <label className="block text-sm font-bold text-zinc-950">
            Rotation
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
              onChange={(event) =>
                props.setWatermarkRotation(Number(event.target.value))
              }
              value={props.watermarkRotation}
            >
              <option value={-45}>-45 degrees</option>
              <option value={-35}>-35 degrees</option>
              <option value={0}>0 degrees</option>
              <option value={45}>45 degrees</option>
            </select>
          </label>
        </>
      ) : null}

      {props.toolSlug === "add-page-numbers" ? (
        <>
          <PositionSelect onChange={props.setPosition} value={props.position} />
          <label className="block text-sm font-bold text-zinc-950">
            Starting number
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
              min={1}
              onChange={(event) =>
                props.setStartNumber(Number(event.target.value))
              }
              type="number"
              value={props.startNumber}
            />
          </label>
          <label className="block text-sm font-bold text-zinc-950">
            Format
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
              onChange={(event) =>
                props.setNumberFormat(
                  event.target.value as "page" | "page-of-total",
                )
              }
              value={props.numberFormat}
            >
              <option value="page">Page number only</option>
              <option value="page-of-total">Page of total</option>
            </select>
          </label>
        </>
      ) : null}

      {props.toolSlug === "add-headers-footers" ? (
        <>
          <TextInput
            label="Header text"
            onChange={props.setHeaderText}
            value={props.headerText}
          />
          <TextInput
            label="Footer text"
            onChange={props.setFooterText}
            value={props.footerText}
          />
        </>
      ) : null}
    </div>
  );
}

function PageSelectionControls({
  ranges,
  selectionMode,
  setRanges,
  setSelectionMode,
}: {
  ranges: string;
  selectionMode: "all" | "custom";
  setRanges: (value: string) => void;
  setSelectionMode: (value: "all" | "custom") => void;
}) {
  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Choose pages</legend>
        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
          <input
            checked={selectionMode === "all"}
            className="size-4 accent-red-600"
            name="edit-page-selection"
            onChange={() => setSelectionMode("all")}
            type="radio"
          />
          All pages
        </label>
        <label className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 p-4 text-sm font-bold">
          <input
            checked={selectionMode === "custom"}
            className="size-4 accent-red-600"
            name="edit-page-selection"
            onChange={() => setSelectionMode("custom")}
            type="radio"
          />
          Custom pages
        </label>
      </fieldset>
      {selectionMode === "custom" ? (
        <label className="block text-sm font-bold text-zinc-950">
          Page ranges
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            onChange={(event) => setRanges(event.target.value)}
            placeholder="Example: 1-3, 5"
            type="text"
            value={ranges}
          />
        </label>
      ) : null}
    </div>
  );
}

function PositionSelect({
  onChange,
  value,
}: {
  onChange: (value: TextPosition) => void;
  value: TextPosition;
}) {
  return (
    <label className="block text-sm font-bold text-zinc-950">
      Position
      <select
        className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
        onChange={(event) => onChange(event.target.value as TextPosition)}
        value={value}
      >
        <option value="center">Center</option>
        <option value="top-left">Top left</option>
        <option value="top-right">Top right</option>
        <option value="bottom-left">Bottom left</option>
        <option value="bottom-right">Bottom right</option>
      </select>
    </label>
  );
}

function TextInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-zinc-950">
      {label}
      <input
        className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        value={value}
      />
    </label>
  );
}

function MetadataResult({ metadata }: { metadata: PdfMetadata }) {
  const rows = [
    ["Title", metadata.title],
    ["Author", metadata.author],
    ["Subject", metadata.subject],
    ["Keywords", metadata.keywords],
    ["Creator", metadata.creator],
    ["Producer", metadata.producer],
    ["Created", metadata.creationDate],
    ["Modified", metadata.modificationDate],
    ["Pages", String(metadata.pageCount)],
  ];

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold">Metadata</h2>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div className="rounded-xl bg-zinc-50 p-3" key={label}>
            <dt className="font-bold text-zinc-950">{label}</dt>
            <dd className="mt-1 break-words text-zinc-600">
              {value || "Not present"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function getActionLabel(slug: string) {
  switch (slug) {
    case "view-metadata":
      return "View metadata";
    case "extract-text":
      return "Extract text";
    case "remove-metadata":
      return "Remove metadata";
    case "rotate-pdf":
      return "Rotate PDF";
    case "add-watermark":
      return "Add watermark";
    case "add-page-numbers":
      return "Add page numbers";
    case "add-headers-footers":
      return "Add headers and footers";
    default:
      return "Process PDF";
  }
}
