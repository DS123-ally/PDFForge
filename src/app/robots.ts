import type { MetadataRoute } from "next";

import { env } from "@/config/env";
import { noindexPaths } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...noindexPaths],
    },
    sitemap: `${env.siteUrl.origin}/sitemap.xml`,
  };
}
