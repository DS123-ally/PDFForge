type OutputNameOptions = {
  suffix: string;
  extension?: string;
};

const reservedCharacters = /[<>:"/\\|?*\u0000-\u001f]/g;

export function createOutputName(
  inputName: string,
  options: OutputNameOptions,
) {
  const extension = normalizeExtension(options.extension ?? ".pdf");
  const suffix = sanitizePart(options.suffix) || "processed";
  const baseName = getBaseName(inputName);
  const cleanBase = sanitizePart(baseName) || "document";

  return `${cleanBase}-${suffix}${extension}`;
}

function normalizeExtension(extension: string) {
  const cleanExtension = extension.trim().replace(reservedCharacters, "");
  return cleanExtension.startsWith(".") ? cleanExtension : `.${cleanExtension}`;
}

function getBaseName(name: string) {
  const cleanName = name.trim().replace(/\\/g, "/").split("/").at(-1) ?? "";
  const extensionIndex = cleanName.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return cleanName;
  }

  return cleanName.slice(0, extensionIndex);
}

function sanitizePart(part: string) {
  return part
    .trim()
    .replace(reservedCharacters, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
