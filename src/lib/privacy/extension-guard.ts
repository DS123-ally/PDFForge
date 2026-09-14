const extensionUrl = /^(chrome|moz|safari|edge)-extension:/i;

export function isExtensionResourceUrl(value: string | null | undefined) {
  return Boolean(value && extensionUrl.test(value));
}

export function findExtensionInjectedNodes(root: ParentNode) {
  return Array.from(
    root.querySelectorAll("script, iframe, embed, object, link, img"),
  ).filter((node) => {
    const src =
      node.getAttribute("src") ??
      node.getAttribute("href") ??
      node.getAttribute("data-src");
    return isExtensionResourceUrl(src);
  });
}
