export const nodeRelease = "24";

export const supportedBrowsers = [
  {
    engine: "Chromium",
    label: "Current Chrome and Edge",
    playwright: "chromium",
  },
  {
    engine: "Gecko",
    label: "Current Firefox",
    playwright: "firefox",
  },
  {
    engine: "WebKit",
    label: "Current Safari",
    playwright: "webkit",
  },
] as const;

export const hostHstsHeader = {
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains",
} as const;

export const requiredReleaseDocs = [
  "docs/release.md",
  "docs/acceptance.md",
] as const;

export function isProductionSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
