import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Vercel to ship pdfjs-dist's worker file alongside audit-ready API
  // routes. serverExternalPackages tells Next not to bundle pdfjs-dist, but
  // Vercel's outputFileTracing may miss pdf.worker.mjs because it's only
  // referenced through a dynamic import inside pdf.mjs.
  outputFileTracingIncludes: {
    // Ship the vendored pdfjs worker with every audit-ready API route.
    // We vendor lib/audit-ready/vendor/pdf.worker.mjs into the app so
    // Vercel always ships it (serverExternalPackages excludes the
    // pdfjs-dist node_modules copy). Kept as an explicit include so
    // Vercel's file tracer never drops it even if the new URL() reference
    // in pbc-parser.ts changes.
    "/api/audit-ready/**": [
      "./lib/audit-ready/vendor/pdf.worker.mjs",
    ],
  },
  // Keep Chromium + puppeteer out of the bundler so the serverless function
  // ships the native binaries correctly (Doc C4 PDF generation).
  serverExternalPackages: [
    "@sparticuz/chromium-min",
    "puppeteer-core",
    "undici",
    "https-proxy-agent",
    "pdfjs-dist",
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
  async redirects() {
    return [
      // MAJOR #3 — Hyphenated persona URLs are historic inbound links (external
      // shares, ads, bookmarks). Canonical pages live at /for/owner, /for/bookkeeper,
      // /for/firm and are allowlisted in middleware.ts (PUBLIC_MARKETING_PATHS).
      // 308 permanent (default when permanent: true) preserves SEO equity and
      // preempts the middleware.ts:244–251 fallthrough that otherwise 307s to /.
      // Deliberately NOT a regex catch-all — future /for-* slugs must be added
      // explicitly so no unintended surface becomes reachable via redirect.
      {
        source: "/for-owner",
        destination: "/for/owner",
        permanent: true,
      },
      {
        source: "/for-bookkeeper",
        destination: "/for/bookkeeper",
        permanent: true,
      },
      {
        source: "/for-firm",
        destination: "/for/firm",
        permanent: true,
      },
      // Also catch trailing-slash variants (Next normalizes, but be defensive
      // against clients that send exact "/for-firm/" without following canonical).
      {
        source: "/for-owner/",
        destination: "/for/owner",
        permanent: true,
      },
      {
        source: "/for-bookkeeper/",
        destination: "/for/bookkeeper",
        permanent: true,
      },
      {
        source: "/for-firm/",
        destination: "/for/firm",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
