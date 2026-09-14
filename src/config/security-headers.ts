export type SecurityHeader = {
  key: string;
  value: string;
};

export function buildContentSecurityPolicy(
  isDevelopment = process.env.NODE_ENV !== "production",
) {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'wasm-unsafe-eval'",
    isDevelopment ? "'unsafe-eval'" : null,
  ].filter(Boolean);

  const connectSrc = [
    "'self'",
    isDevelopment ? "ws:" : null,
    isDevelopment ? "wss:" : null,
  ].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "media-src 'none'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

export function getSecurityHeaders(): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(),
    },
    {
      key: "Referrer-Policy",
      value: "no-referrer",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "off",
    },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    {
      key: "X-Permitted-Cross-Domain-Policies",
      value: "none",
    },
  ];
}
