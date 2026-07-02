import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MARKETING_HOSTS = new Set(["advisacor.com", "www.advisacor.com"]);
const APP_HOSTS = new Set(["app.advisacor.com"]);

const PUBLIC_MARKETING_PATHS = new Set([
  "/",
  "/about",
  "/privacy",
  "/coming-soon",
  // App routes reachable from marketing hosts (auth + primary product surfaces).
  // Role/auth gating happens inside these routes; middleware only controls reachability.
  "/signin",
  "/signup",
  "/dashboard",
  "/onboarding",
  "/admin",
  "/admin/refunds",
  "/refund-policy",
  "/support",
]);

const PUBLIC_MARKETING_API_PATHS = new Set([
  "/api/early-access",
  "/api/stripe-webhook",
]);

function normalizedHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(":")[0].toLowerCase();
}

function isLocalDevHost(host: string) {
  return host.includes("localhost") || host === "127.0.0.1";
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(?:avif|gif|ico|jpg|jpeg|png|svg|webp|css|js|map|txt|xml|woff|woff2)$/i.test(pathname)
  );
}

function isMarketingAllowed(pathname: string) {
  return (
    PUBLIC_MARKETING_PATHS.has(pathname) ||
    PUBLIC_MARKETING_API_PATHS.has(pathname) ||
    // Allow all admin subpaths (admin/refunds, admin/users, etc.) and dashboard subpaths.
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/onboarding/") ||
    // Public, token-gated close packet share links.
    pathname.startsWith("/share/packet/") ||
    // Allow app API surfaces that need to run for signed-in users on the marketing host.
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/pulse/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/integrations/") ||
    pathname.startsWith("/#")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = normalizedHost(request);

  if (MARKETING_HOSTS.has(host) && !isStaticAsset(pathname) && !isMarketingAllowed(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (APP_HOSTS.has(host) && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/integrations/")) console.log("MIDDLEWARE PATH:", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
