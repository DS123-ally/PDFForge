export function getToolHref(slug: string) {
  return `/tools/${slug}`;
}

export function getWorkspaceHref(slug: string) {
  return `/workspace#${slug}`;
}

export function getToolsCategoryHref(category: string) {
  if (category === "All") {
    return "/tools";
  }

  return `/tools#${category}`;
}

export function readWorkspaceSlug(hash: string) {
  const value = hash.replace(/^#/, "").split("&")[0] ?? "";
  const slug = value.trim();

  if (!slug || slug === "main-content") {
    return "";
  }

  return slug;
}

export function captureWorkspaceToolSlug() {
  if (typeof document === "undefined") {
    return "";
  }

  const fromHash = readWorkspaceSlug(window.location.hash);

  if (fromHash) {
    document.documentElement.dataset.workspaceTool = fromHash;
    return fromHash;
  }

  return document.documentElement.dataset.workspaceTool ?? "";
}

export const workspaceHashCaptureScript =
  '(()=>{const h=location.hash.replace(/^#/,"").split("&")[0].trim();if(h&&h!=="main-content")document.documentElement.dataset.workspaceTool=h;})();';

export function readToolsCategory(hash: string) {
  return hash.replace(/^#/, "").split("&")[0] ?? "";
}

export function requestLeaksToolChoice(url: string) {
  try {
    const parsed = new URL(url, "http://127.0.0.1");
    return /\/tools\/[a-z0-9-]+/i.test(parsed.pathname);
  } catch {
    return false;
  }
}
