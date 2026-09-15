import { env } from "@/config/env";
import { tools } from "@/config/tools";

export const siteName = "PDFForge";

export function absoluteUrl(path = "/") {
  return new URL(path, env.siteUrl).toString();
}

export const noIndex = { index: false, follow: false } as const;

export const noindexPaths = [
  "/offline",
  "/workspace",
  "/tools/merge-pdf/states",
] as const;

export const indexablePaths = [
  "/",
  "/tools",
  "/privacy",
  "/about",
  ...tools.map((tool) => `/tools/${tool.slug}`),
] as const;
