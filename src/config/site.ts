import { comparisons } from "@/config/comparisons";
import { env } from "@/config/env";
import { industries } from "@/config/industries";
import { tools } from "@/config/tools";

export const siteName = "PDFForge";

export function absoluteUrl(path = "/") {
  return new URL(path, env.siteUrl).toString();
}

export const noIndex = { index: false, follow: false } as const;

export const noindexPaths = [
  "/health",
  "/offline",
  "/workspace",
  "/tools/merge-pdf/states",
] as const;

export const indexablePaths = [
  "/",
  "/tools",
  "/privacy",
  "/about",
  ...comparisons.map((page) => `/compare/${page.slug}`),
  ...industries.map((page) => `/for/${page.slug}`),
  ...tools.map((tool) => `/tools/${tool.slug}`),
] as const;
