import { createOutputName } from "@/lib/files/create-output-name";
import { ObjectUrlManager } from "@/lib/files/object-url-manager";

type DownloadSource = Blob | ArrayBuffer | Uint8Array;

type DownloadOptions = {
  filename?: string;
  sourceName?: string;
  suffix?: string;
  extension?: string;
  manager?: ObjectUrlManager;
};

export function createDownload(
  source: DownloadSource,
  options: DownloadOptions,
) {
  if (typeof document === "undefined") {
    throw new Error("Downloads can only be created in the browser.");
  }

  const blob =
    source instanceof Blob
      ? source
      : new Blob([
          source instanceof Uint8Array ? toArrayBuffer(source) : source,
        ]);
  const manager = options.manager ?? new ObjectUrlManager();
  const url = manager.create(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    options.filename ??
    createOutputName(options.sourceName ?? "document.pdf", {
      suffix: options.suffix ?? "processed",
      extension: options.extension ?? ".pdf",
    });
  link.rel = "noopener";
  link.style.display = "none";

  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => manager.revoke(url), 0);

  return { filename: link.download, url };
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
