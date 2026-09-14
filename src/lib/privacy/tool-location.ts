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
  return value.trim();
}

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
