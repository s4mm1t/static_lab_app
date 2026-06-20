import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const isProductionDeploy = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const devBackendOrigin = process.env.STATIC_LAB_DEV_API_ORIGIN || "http://127.0.0.1:8000";
const designConnectSrc = isProductionDeploy
  ? "'self'"
  : "'self' http://127.0.0.1:8000 http://localhost:8000";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src ${designConnectSrc}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const designContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src ${designConnectSrc}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const designSecurityHeaders = securityHeaders.map((header) => {
  if (header.key === "Content-Security-Policy") {
    return { ...header, value: designContentSecurityPolicy };
  }
  if (header.key === "X-Frame-Options") {
    return { ...header, value: "SAMEORIGIN" };
  }
  return header;
});

const nextConfig: NextConfig = {
  outputFileTracingRoot: appDir,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/design/:path*",
        headers: [
          ...designSecurityHeaders,
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (isProductionDeploy) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `${devBackendOrigin}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${devBackendOrigin}/health`,
      },
    ];
  },
};

export default nextConfig;
