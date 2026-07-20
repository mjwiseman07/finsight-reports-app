import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Chromium + puppeteer out of the bundler so the serverless function
  // ships the native binaries correctly (Doc C4 PDF generation).
  serverExternalPackages: [
    "@sparticuz/chromium-min",
    "puppeteer-core",
    "undici",
    "https-proxy-agent",
    "pdf-parse",
  ],
  async headers() {
    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
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
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
