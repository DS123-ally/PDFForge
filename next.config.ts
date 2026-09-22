import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.100"],
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: getSecurityHeaders(),
    },
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/ocr/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/health",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store",
        },
        {
          key: "X-Robots-Tag",
          value: "noindex, nofollow",
        },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
      ],
    },
  ],
};

export default nextConfig;
