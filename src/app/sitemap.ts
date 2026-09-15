import type { MetadataRoute } from "next";

import { absoluteUrl, indexablePaths } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths.map((pathname) => ({
    url: absoluteUrl(pathname),
    lastModified: new Date("2026-09-15"),
    changeFrequency: "weekly" as const,
    priority: pathname === "/" ? 1 : pathname.split("/").length > 2 ? 0.9 : 0.8,
  }));
}
