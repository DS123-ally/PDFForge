export const hashAlgorithms = ["SHA-256", "SHA-512"] as const;

export type HashAlgorithm = (typeof hashAlgorithms)[number];

export async function hashBytes(
  bytes: BufferSource,
  algorithm: HashAlgorithm = "SHA-256",
) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser cannot hash files locally.");
  }

  const digest = await globalThis.crypto.subtle.digest(algorithm, bytes);
  return toHex(digest);
}

export async function hashFile(
  file: Blob,
  algorithm: HashAlgorithm = "SHA-256",
) {
  return hashBytes(await file.arrayBuffer(), algorithm);
}

export function normalizeHash(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^0x/, "")
    .replace(/[^0-9a-f]/g, "");
}

export function hashesMatch(left: string, right: string) {
  const a = normalizeHash(left);
  const b = normalizeHash(right);
  return a.length > 0 && a === b;
}

export function algorithmForHashLength(hash: string): HashAlgorithm | null {
  const hex = normalizeHash(hash);

  if (hex.length === 64) {
    return "SHA-256";
  }

  if (hex.length === 128) {
    return "SHA-512";
  }

  return null;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
