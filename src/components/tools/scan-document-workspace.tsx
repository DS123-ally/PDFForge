"use client";

import { Camera, Images, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { PrivacyNotice } from "@/components/pdf/privacy-notice";
import { DownloadResultCard } from "@/components/tools/download-result-card";
import { MobileActionBar } from "@/components/tools/mobile-action-bar";
import { ProcessingCard } from "@/components/tools/processing-card";
import { Button } from "@/components/ui/button";
import { createDownload } from "@/lib/files/create-download";
import { createOutputName } from "@/lib/files/create-output-name";
import { ObjectUrlManager } from "@/lib/files/object-url-manager";
import { validateFiles } from "@/lib/files/validate-file";
import type {
  ImageFitMode,
  ImageOrientation,
  ImagePageSize,
} from "@/lib/pdf/image-layout";
import { registerTemporaryCleanup } from "@/lib/privacy/temporary-data";
import { blobToImageData, videoFrameToImageData } from "@/lib/scan/canvas";
import { detectDocumentQuad } from "@/lib/scan/detect-quad";
import { flattenScannedPage } from "@/lib/scan/flatten-page";
import { recognizeImage, terminateOcrWorker } from "@/lib/scan/ocr";
import { fullFrameQuad, quadsAreStable, type Quad } from "@/lib/scan/quad";
import { scannedPagesToPdf } from "@/lib/scan/searchable-pdf";
import {
  initialProcessingState,
  processingReducer,
} from "@/lib/workers/processing-state";

type ScanPage = {
  blob: Blob;
  height: number;
  id: string;
  name: string;
  previewUrl: string;
  width: number;
};

type CropSession = {
  image: ImageData;
  previewUrl: string;
  quad: Quad;
  sourceName: string;
};

const featureChips = [
  "No watermark",
  "Live edge tracking",
  "Perspective fix",
  "Multi-page",
  "OCR to PDF",
  "Gallery import",
];

export function ScanDocumentWorkspace() {
  const galleryId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrls = useRef(new ObjectUrlManager());
  const abortRef = useRef<AbortController | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [enableOcr, setEnableOcr] = useState(true);
  const [pageSize, setPageSize] = useState<ImagePageSize>("a4");
  const [orientation, setOrientation] = useState<ImageOrientation>("portrait");
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [crop, setCrop] = useState<CropSession | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [importError, setImportError] = useState("");
  const [liveQuad, setLiveQuad] = useState<Quad | null>(null);
  const [state, dispatch] = useReducer(
    processingReducer,
    initialProcessingState,
  );

  const canCreate = pages.length > 0 && state.status !== "processing";

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLiveQuad(null);
    setCameraOpen(false);
  }, []);

  const clearPages = useCallback(() => {
    objectUrls.current.revokeAll();
    setPages([]);
    setCrop((current) => {
      if (current) {
        objectUrls.current.revoke(current.previewUrl);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    const urls = objectUrls.current;
    const unregister = registerTemporaryCleanup(() => {
      abortRef.current?.abort();
      stopCamera();
      urls.revokeAll();
      void terminateOcrWorker();
    });

    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        stopCamera();
      }
    };

    document.addEventListener("visibilitychange", onHidden);

    return () => {
      unregister();
      document.removeEventListener("visibilitychange", onHidden);
      abortRef.current?.abort();
      stopCamera();
      urls.revokeAll();
      void terminateOcrWorker();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !autoCapture) {
      return;
    }

    let frame = 0;
    let stableCount = 0;
    let previous: Quad | null = null;
    let active = true;

    const tick = () => {
      const video = videoRef.current;

      if (!active || !video || video.readyState < 2) {
        frame = requestAnimationFrame(tick);
        return;
      }

      try {
        const snapshot = videoFrameToImageData(video, 320);
        const nextQuad = detectDocumentQuad(snapshot);
        setLiveQuad(nextQuad);

        if (quadsAreStable(previous, nextQuad, 8)) {
          stableCount += 1;
        } else {
          stableCount = 0;
        }

        previous = nextQuad;

        if (stableCount >= 18) {
          void captureFromCamera();
          return;
        }
      } catch {
        // Keep the preview running if a single frame cannot be sampled.
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
    // captureFromCamera is stable enough via cameraOpen close after capture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture, cameraOpen]);

  async function openCamera() {
    setCameraError("");
    setImportError("");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera needs HTTPS or localhost. Import from gallery instead.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 1080 },
          width: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        const video = videoRef.current;

        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => {
            setCameraError("The camera preview could not start.");
            stopCamera();
          });
        }
      });
    } catch {
      setCameraError(
        "Camera permission was denied or the camera is unavailable.",
      );
      stopCamera();
    }
  }

  async function captureFromCamera() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      const image = videoFrameToImageData(video);
      const previewUrl = objectUrls.current.create(
        await imageDataToPngBlob(image),
      );
      setCrop({
        image,
        previewUrl,
        quad: detectDocumentQuad(image),
        sourceName: `scan-${pages.length + 1}.jpg`,
      });
      stopCamera();
    } catch {
      setCameraError("This camera frame could not be captured.");
    }
  }

  async function importGallery(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setImportError("");
    const { valid, errors } = await validateFiles(Array.from(fileList), {
      acceptedTypes: ["image"],
      existingFingerprints: new Set(),
    });

    if (errors.length > 0 && valid.length === 0) {
      setImportError("Use JPG or PNG photos. Other formats are not scanned.");
      return;
    }

    for (const item of valid) {
      try {
        const image = await blobToImageData(item.file);

        try {
          const flattened = await flattenScannedPage(
            image,
            detectDocumentQuad(image),
          );
          addPage(
            flattened.blob,
            flattened.width,
            flattened.height,
            item.file.name,
          );
        } catch {
          addPage(item.file, image.width, image.height, item.file.name);
        }
      } catch {
        addPage(item.file, 1, 1, item.file.name);
      }
    }

    if (galleryRef.current) {
      galleryRef.current.value = "";
    }
  }

  function addPage(blob: Blob, width: number, height: number, name: string) {
    const previewUrl = objectUrls.current.create(blob);
    setPages((current) => [
      ...current,
      {
        blob,
        height,
        id: crypto.randomUUID(),
        name,
        previewUrl,
        width,
      },
    ]);
  }

  async function confirmCrop() {
    if (!crop) {
      return;
    }

    const flattened = await flattenScannedPage(crop.image, crop.quad);
    addPage(flattened.blob, flattened.width, flattened.height, crop.sourceName);
    objectUrls.current.revoke(crop.previewUrl);
    setCrop(null);
  }

  function cancelCrop() {
    if (crop) {
      objectUrls.current.revoke(crop.previewUrl);
    }
    setCrop(null);
  }

  function removePage(id: string) {
    setPages((current) => {
      const match = current.find((page) => page.id === id);

      if (match) {
        objectUrls.current.revoke(match.previewUrl);
      }

      return current.filter((page) => page.id !== id);
    });
  }

  async function createPdf() {
    if (!canCreate) {
      return;
    }

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    dispatch({
      message: enableOcr
        ? "Loading on-device OCR"
        : "Building a local scan PDF",
      type: "start",
    });

    try {
      const scanned = [];

      for (const [index, page] of pages.entries()) {
        if (abort.signal.aborted) {
          throw new DOMException("Cancelled", "AbortError");
        }

        const bytes = await page.blob.arrayBuffer();
        const words = enableOcr
          ? await recognizeImage(page.blob, abort.signal)
          : [];
        scanned.push({
          bytes,
          height: page.height,
          mimeType: page.blob.type || "image/jpeg",
          name: page.name,
          words,
          width: page.width,
        });
        dispatch({
          message: enableOcr
            ? `Reading page ${index + 1} of ${pages.length} on this device`
            : `Adding page ${index + 1} of ${pages.length}`,
          progress: Math.round(((index + 1) / pages.length) * 80),
          type: "progress",
        });
      }

      dispatch({
        message: "Writing the local PDF",
        progress: 90,
        type: "progress",
      });
      const result = await scannedPagesToPdf(scanned, {
        fit: "fit" satisfies ImageFitMode,
        margin: 18,
        orientation,
        pageSize,
      });

      if (abort.signal.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }

      dispatch({
        result: {
          fileCount: pages.length,
          filename: createOutputName(pages[0]?.name ?? "document.jpg", {
            suffix: enableOcr ? "scan-ocr" : "scan",
          }),
          outputBytes: result.outputBytes,
          totalBytes: pages.reduce((total, page) => total + page.blob.size, 0),
          totalPages: result.totalPages,
        },
        type: "complete",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        dispatch({ message: "Scan cancelled", type: "cancelled" });
        return;
      }

      dispatch({
        code: "processing_failed",
        message: enableOcr
          ? "On-device OCR could not finish. Turn OCR off to save an image PDF, or try a clearer photo."
          : "The scanned PDF could not be created on this device.",
        type: "error",
      });
    }
  }

  function downloadResult() {
    if (!state.result?.outputBytes) {
      return;
    }

    createDownload(state.result.outputBytes, {
      filename: state.result.filename ?? "document-scan.pdf",
    });
  }

  function processAnother() {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
    clearPages();
    void terminateOcrWorker();
  }

  return (
    <div className="pb-24 md:pb-0">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold tracking-wide text-red-600 uppercase">
          Local scanner
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Camera or photos to a clean PDF
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Edge detection, de-skew, and optional OCR run in this tab. Frames,
          photos, and text never leave this device.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {featureChips.map((chip) => (
            <li
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700"
              key={chip}
            >
              {chip}
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => void openCamera()} type="button">
            <Camera aria-hidden="true" className="size-4" />
            Open Camera
          </Button>
          <Button
            onClick={() => galleryRef.current?.click()}
            type="button"
            variant="secondary"
          >
            <Images aria-hidden="true" className="size-4" />
            Import from Gallery
          </Button>
        </div>
        <input
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="sr-only"
          data-testid="scan-gallery-input"
          id={galleryId}
          multiple
          onChange={(event) => void importGallery(event.target.files)}
          ref={galleryRef}
          type="file"
        />
        {cameraError ? (
          <p className="mt-4 text-sm text-red-700" role="status">
            {cameraError}
          </p>
        ) : null}
        {importError ? (
          <p className="mt-4 text-sm text-red-700" role="status">
            {importError}
          </p>
        ) : null}
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FeatureCard
          body="Finds four corners on a desk photo. Drag them if the outline is wrong."
          title="Auto-edge"
        />
        <FeatureCard
          body="Warps the page to a rectangle before it is added to the PDF."
          title="De-skew"
        />
        <FeatureCard
          body="On-device OCR. Accuracy varies. Scans never leave this device."
          title="OCR PDF"
        />
      </div>

      {cameraOpen ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-black">
          <div className="relative">
            <video
              autoPlay
              className="aspect-[3/4] w-full bg-black object-cover sm:aspect-video"
              muted
              playsInline
              ref={videoRef}
            />
            {liveQuad && videoRef.current ? (
              <QuadOverlay
                height={videoRef.current.videoHeight || 1}
                quad={liveQuad}
                width={videoRef.current.videoWidth || 1}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 p-4">
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                checked={autoCapture}
                onChange={(event) => setAutoCapture(event.target.checked)}
                type="checkbox"
              />
              Auto-capture when the page is steady
            </label>
            <div className="flex gap-2">
              <Button onClick={stopCamera} type="button" variant="secondary">
                Cancel
              </Button>
              <Button onClick={() => void captureFromCamera()} type="button">
                Capture page
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {crop ? (
        <CropEditor
          crop={crop}
          onCancel={cancelCrop}
          onChange={(quad) => setCrop({ ...crop, quad })}
          onConfirm={() => void confirmCrop()}
        />
      ) : null}

      {pages.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Pages in this scan</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {pages.map((page, index) => (
              <li
                className="relative overflow-hidden rounded-xl border border-zinc-200"
                key={page.id}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Scanned page ${index + 1}`}
                  className="aspect-[3/4] w-full object-cover"
                  src={page.previewUrl}
                />
                <button
                  className="absolute top-2 right-2 grid size-11 place-items-center rounded-full bg-white/90 text-zinc-800"
                  onClick={() => removePage(page.id)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                  <span className="sr-only">Remove page {index + 1}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-zinc-950">
              Page size
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) =>
                  setPageSize(event.target.value as ImagePageSize)
                }
                value={pageSize}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-950">
              Orientation
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                onChange={(event) =>
                  setOrientation(event.target.value as ImageOrientation)
                }
                value={orientation}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-zinc-700">
            <input
              checked={enableOcr}
              className="mt-1"
              onChange={(event) => setEnableOcr(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong className="font-semibold text-zinc-950">
                Make searchable with on-device OCR
              </strong>
              . English only. Accuracy varies. Models load from this site, not a
              third-party OCR API.
            </span>
          </label>
          <div className="mt-5 hidden justify-end md:flex">
            <Button
              disabled={!canCreate}
              onClick={() => void createPdf()}
              type="button"
            >
              Create scanned PDF
            </Button>
          </div>
        </section>
      ) : null}

      {state.status !== "idle" && state.status !== "success" ? (
        <div className="mt-8">
          <ProcessingCard
            onCancel={() => abortRef.current?.abort()}
            onReset={() => dispatch({ type: "reset" })}
            state={state}
          />
        </div>
      ) : null}

      {state.status === "success" && state.result?.outputBytes ? (
        <div className="mt-8">
          <DownloadResultCard
            description={`${state.result.totalPages} scanned page${state.result.totalPages === 1 ? "" : "s"} ready on this device.`}
            downloadLabel="Download PDF"
            onDownload={downloadResult}
            onProcessAnother={processAnother}
            title="Your scan PDF is ready"
          />
        </div>
      ) : null}

      <div className="mt-7">
        <PrivacyNotice />
      </div>
      <MobileActionBar
        disabled={!canCreate}
        label="Create scanned PDF"
        onClick={() => void createPdf()}
      />
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4">
      <Sparkles aria-hidden="true" className="size-5 text-red-600" />
      <h3 className="mt-3 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-zinc-600">{body}</p>
    </article>
  );
}

function CropEditor({
  crop,
  onCancel,
  onChange,
  onConfirm,
}: {
  crop: CropSession;
  onCancel: () => void;
  onChange: (quad: Quad) => void;
  onConfirm: () => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragIndex = useRef<number | null>(null);

  function updateCorner(index: number, event: ReactPointerEvent<Element>) {
    const image = imageRef.current;

    if (!image) {
      return;
    }

    const box = image.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * crop.image.width;
    const y = ((event.clientY - box.top) / box.height) * crop.image.height;
    const next = [...crop.quad] as Quad;
    next[index] = {
      x: Math.min(crop.image.width - 1, Math.max(0, x)),
      y: Math.min(crop.image.height - 1, Math.max(0, y)),
    };
    onChange(next);
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">Adjust page edges</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Drag the four corners onto the document, then add the flattened page.
      </p>
      <div className="relative mt-4 overflow-hidden rounded-xl bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Captured page"
          className="max-h-[70vh] w-full object-contain"
          ref={imageRef}
          src={crop.previewUrl}
        />
        <QuadOverlay
          height={crop.image.height}
          onPointerDown={(index, event) => {
            dragIndex.current = index;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateCorner(index, event);
          }}
          onPointerMove={(index, event) => {
            if (dragIndex.current === index) {
              updateCorner(index, event);
            }
          }}
          onPointerUp={() => {
            dragIndex.current = null;
          }}
          quad={crop.quad}
          width={crop.image.width}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          onClick={() =>
            onChange(fullFrameQuad(crop.image.width, crop.image.height))
          }
          type="button"
          variant="secondary"
        >
          Use full photo
        </Button>
        <Button onClick={onCancel} type="button" variant="ghost">
          Discard
        </Button>
        <Button onClick={onConfirm} type="button">
          Add page
        </Button>
      </div>
    </section>
  );
}

function QuadOverlay({
  height,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  quad,
  width,
}: {
  height: number;
  onPointerDown?: (
    index: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onPointerMove?: (
    index: number,
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
  onPointerUp?: () => void;
  quad: Quad;
  width: number;
}) {
  const points = quad.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg
      aria-hidden={!onPointerDown}
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polygon
        fill="rgba(220,38,38,0.12)"
        points={points}
        stroke="#dc2626"
        strokeWidth={Math.max(2, width / 180)}
      />
      {quad.map((point, index) => (
        <circle
          className={
            onPointerDown ? "pointer-events-auto cursor-grab" : undefined
          }
          cx={point.x}
          cy={point.y}
          fill="#fff"
          key={`${point.x}-${point.y}-${index}`}
          onPointerDown={
            onPointerDown ? (event) => onPointerDown(index, event) : undefined
          }
          onPointerMove={
            onPointerMove ? (event) => onPointerMove(index, event) : undefined
          }
          onPointerUp={onPointerUp}
          r={Math.max(10, width / 40)}
          stroke="#dc2626"
          strokeWidth={3}
        />
      ))}
    </svg>
  );
}

async function imageDataToPngBlob(image: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser could not preview the capture.");
  }

  context.putImageData(image, 0, 0);
  return canvasToPng(canvas);
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("This browser could not preview the capture."));
    }, "image/png");
  });
}
