const units = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / 1024 ** unitIndex;
  const formatted =
    size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}
