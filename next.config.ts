import type { NextConfig } from "next";

import { getSecurityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.100"],
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      headers: getSecurityHeaders(),
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
