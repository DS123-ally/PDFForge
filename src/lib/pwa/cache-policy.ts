export type CacheDecisionInput = {
  cacheControl?: string | null;
  contentType?: string | null;
  destination?: string;
  method: string;
  url: string;
};

const shellPaths = new Set([
  "/",
  "/offline",
  "/tools",
  "/privacy",
  "/about",
  "/manifest.webmanifest",
]);

export function isSensitiveDocumentRequest({
  contentType,
  method,
  url,
}: CacheDecisionInput) {
  if (method !== "GET" && method !== "HEAD") {
    return true;
  }

  const parsed = safeUrl(url);

  if (!parsed) {
    return true;
  }

  if (parsed.protocol === "blob:" || parsed.protocol === "data:") {
    return true;
  }

  const path = parsed.pathname.toLowerCase();
  const type = contentType?.toLowerCase() ?? "";

  return (
    path.endsWith(".pdf") ||
    path.endsWith(".zip") ||
    type.includes("application/pdf") ||
    type.includes("application/zip") ||
    type.includes("application/octet-stream")
  );
}

export function shouldCacheResponse(input: CacheDecisionInput) {
  if (isSensitiveDocumentRequest(input)) {
    return false;
  }

  const parsed = safeUrl(input.url);

  if (!parsed) {
    return false;
  }

  if (parsed.searchParams.has("token") || parsed.searchParams.has("password")) {
    return false;
  }

  if (parsed.pathname.includes("webpack-hmr") || parsed.pathname === "/sw.js") {
    return false;
  }

  if (input.destination === "document" || shellPaths.has(parsed.pathname)) {
    return true;
  }

  return (
    parsed.pathname.startsWith("/_next/static/") ||
    parsed.pathname.startsWith("/icons/") ||
    parsed.pathname === "/manifest.webmanifest"
  );
}

export function isAppShellPath(pathname: string) {
  return shellPaths.has(pathname);
}

function safeUrl(url: string) {
  try {
    return new URL(url, "http://127.0.0.1");
  } catch {
    return null;
  }
}
