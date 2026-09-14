"use client";

import { FileText, ShieldCheck } from "lucide-react";
import {
  type DragEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { FileListItem } from "@/components/pdf/file-list-item";
import { formatFileSize } from "@/lib/files/format-file-size";
import { ObjectUrlManager } from "@/lib/files/object-url-manager";
import { registerTemporaryCleanup } from "@/lib/privacy/temporary-data";
import {
  type AcceptedFileType,
  createFileFingerprint,
  defaultMaxFileSizeBytes,
  getAcceptAttribute,
  validateFiles,
} from "@/lib/files/validate-file";
import { getMemoryWarningMessage } from "@/lib/performance/memory";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  acceptedTypes?: readonly AcceptedFileType[];
  allowPasswordProtected?: boolean;
  allowReorder?: boolean;
  clearSignal?: number;
  maxFileSizeBytes?: number;
  multiple?: boolean;
  onFilesChange?: (files: LocalUploadedFile[]) => void;
};

export type LocalUploadedFile = {
  file: File;
  fingerprint: string;
  id: string;
  isPasswordProtected?: boolean;
  pageCount?: number;
  previewUrl: string;
};

type RejectedFile = {
  id: string;
  name: string;
  message: string;
};

export function FileUploader({
  acceptedTypes = ["pdf"],
  allowPasswordProtected = false,
  allowReorder = false,
  clearSignal = 0,
  maxFileSizeBytes = defaultMaxFileSizeBytes,
  multiple = false,
  onFilesChange,
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<ObjectUrlManager | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [files, setFiles] = useState<LocalUploadedFile[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const accept = useMemo(
    () => getAcceptAttribute(acceptedTypes),
    [acceptedTypes],
  );
  const selectedFingerprints = useMemo(
    () => new Set(files.map((file) => file.fingerprint)),
    [files],
  );
  const selectedCount = files.length;
  const memoryWarning = useMemo(
    () =>
      getMemoryWarningMessage(
        files.reduce((total, file) => total + file.file.size, 0),
      ),
    [files],
  );

  useEffect(() => {
    objectUrls.current = new ObjectUrlManager();
    const unregister = registerTemporaryCleanup(() => {
      objectUrls.current?.revokeAll();
    });

    return () => {
      unregister();
      objectUrls.current?.revokeAll();
    };
  }, []);

  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  useEffect(() => {
    if (clearSignal > 0) {
      clearFiles();
    }
  }, [clearSignal]);

  async function addFiles(fileList: FileList | File[]) {
    const incomingFiles = Array.from(fileList);

    if (incomingFiles.length === 0) {
      return;
    }

    setIsChecking(true);
    const validation = await validateFiles(
      multiple ? incomingFiles : incomingFiles.slice(0, 1),
      {
        acceptedTypes,
        allowPasswordProtected,
        existingFingerprints: selectedFingerprints,
        maxFileSizeBytes,
      },
    );

    const manager = objectUrls.current;
    const acceptedFiles = validation.valid.map(
      ({ file, fingerprint, isPasswordProtected, pageCount }) => ({
        file,
        fingerprint,
        id: createLocalFileId(file),
        isPasswordProtected,
        pageCount,
        previewUrl: manager?.create(file) ?? "",
      }),
    );

    setFiles((currentFiles) => {
      if (multiple) {
        return [...currentFiles, ...acceptedFiles];
      }

      if (acceptedFiles.length === 0) {
        return currentFiles;
      }

      for (const file of currentFiles) {
        objectUrls.current?.revoke(file.previewUrl);
      }

      return acceptedFiles;
    });
    setRejectedFiles(
      validation.errors.map(({ file, error }, index) => ({
        id: `${createFileFingerprint(file)}::${error.code}::${index}`,
        name: file.name || "Unnamed file",
        message: error.userMessage,
      })),
    );
    setIsChecking(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeFile(fileId: string) {
    setFiles((currentFiles) => {
      const fileToRemove = currentFiles.find((file) => file.id === fileId);

      if (fileToRemove) {
        objectUrls.current?.revoke(fileToRemove.previewUrl);
      }

      return currentFiles.filter((file) => file.id !== fileId);
    });
  }

  function clearFiles() {
    objectUrls.current?.revokeAll();
    setFiles([]);
    setRejectedFiles([]);
  }

  function moveFile(fileId: string, direction: "up" | "down") {
    setFiles((currentFiles) => {
      const currentIndex = currentFiles.findIndex((file) => file.id === fileId);
      const nextIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentFiles.length
      ) {
        return currentFiles;
      }

      return reorderFiles(currentFiles, currentIndex, nextIndex);
    });
  }

  function dropFile(targetFileId: string) {
    if (!draggedFileId || draggedFileId === targetFileId) {
      return;
    }

    setFiles((currentFiles) => {
      const fromIndex = currentFiles.findIndex(
        (file) => file.id === draggedFileId,
      );
      const toIndex = currentFiles.findIndex(
        (file) => file.id === targetFileId,
      );

      if (fromIndex < 0 || toIndex < 0) {
        return currentFiles;
      }

      return reorderFiles(currentFiles, fromIndex, toIndex);
    });
    setDraggedFileId(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDragActive(false);
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    await addFiles(event.dataTransfer.files);
  }

  return (
    <div>
      <section
        aria-busy={isChecking}
        aria-describedby={`${inputId}-helper ${inputId}-privacy`}
        aria-labelledby={`${inputId}-title`}
        className={cn(
          "rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors sm:py-9",
          dragActive ? "border-red-600 bg-red-50" : "border-red-500 bg-white",
        )}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          accept={accept}
          className="sr-only"
          id={inputId}
          multiple={multiple}
          onChange={(event) => {
            if (event.currentTarget.files) {
              void addFiles(event.currentTarget.files);
            }
          }}
          type="file"
        />
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-red-50 text-red-600">
          <FileText aria-hidden="true" className="size-5" />
        </span>
        <h2 id={`${inputId}-title`} className="mt-3 text-base font-bold">
          {multiple ? "Drop your files here" : "Drop your file here"}
        </h2>
        <Button
          className="mt-3"
          disabled={isChecking}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isChecking
            ? "Checking..."
            : multiple
              ? "Select Files"
              : "Select a File"}
        </Button>
        <p className="mt-2 text-xs text-zinc-500" id={`${inputId}-helper`}>
          {getHelperText(acceptedTypes)} up to{" "}
          {formatFileSize(maxFileSizeBytes)}
        </p>
        <p
          className="mx-auto mt-3 flex max-w-max items-center gap-2 text-xs font-semibold text-emerald-700"
          id={`${inputId}-privacy`}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          Files stay local on this device
        </p>
      </section>

      <div aria-live="polite" className="mt-5">
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-zinc-950">
              {selectedCount} {selectedCount === 1 ? "file" : "files"} ready
            </p>
            <Button onClick={clearFiles} type="button" variant="ghost">
              Clear all
            </Button>
          </div>
        ) : null}

        {files.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {files.map((file) => (
              <FileListItem
                key={file.id}
                isDragging={draggedFileId === file.id}
                name={file.file.name}
                onDragEnd={() => setDraggedFileId(null)}
                onDragStart={
                  allowReorder ? () => setDraggedFileId(file.id) : undefined
                }
                onDrop={allowReorder ? () => dropFile(file.id) : undefined}
                onMoveDown={
                  allowReorder && files.at(-1)?.id !== file.id
                    ? () => moveFile(file.id, "down")
                    : undefined
                }
                onMoveUp={
                  allowReorder && files[0]?.id !== file.id
                    ? () => moveFile(file.id, "up")
                    : undefined
                }
                onRemove={() => removeFile(file.id)}
                pageCount={file.pageCount}
                previewUrl={file.previewUrl}
                note={
                  file.isPasswordProtected ? "Password protected" : undefined
                }
                size={formatFileSize(file.file.size)}
              />
            ))}
          </ul>
        ) : null}

        {memoryWarning ? (
          <p
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
            role="status"
          >
            {memoryWarning}
          </p>
        ) : null}

        {rejectedFiles.length > 0 ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-900">
              Some files could not be added
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              {rejectedFiles.map((file) => (
                <li className="min-w-0" key={file.id}>
                  <span className="font-semibold">{file.name}:</span>{" "}
                  {file.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function reorderFiles<T>(files: T[], fromIndex: number, toIndex: number) {
  const nextFiles = [...files];
  const [movedFile] = nextFiles.splice(fromIndex, 1);

  if (!movedFile) {
    return files;
  }

  nextFiles.splice(toIndex, 0, movedFile);
  return nextFiles;
}

function createLocalFileId(file: File) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${createFileFingerprint(file)}::${Date.now()}`;
}

function getHelperText(acceptedTypes: readonly AcceptedFileType[]) {
  if (acceptedTypes.includes("pdf") && acceptedTypes.includes("image")) {
    return "PDF, JPG, or PNG files";
  }

  if (acceptedTypes.includes("image")) {
    return "JPG or PNG files";
  }

  return "PDF files only";
}
