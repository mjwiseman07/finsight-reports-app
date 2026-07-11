import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SOLO_BK_GATE_COOKIE,
  REVIEW_ASSIST_GATE_COOKIE,
  isSoloBkGated,
  isSoloBkBypassAllowed,
  hasSoloBkBypassToken,
  hasSoloBkBypassCookie,
  isReviewAssistGated,
  isReviewAssistBypassAllowed,
  hasReviewAssistBypassToken,
  hasReviewAssistBypassCookie,
} from "./lib/tcp1/launch-gates";

const MARKETING_HOSTS = new Set(["advisacor.com", "www.advisacor.com"]);
const APP_HOSTS = new Set(["app.advisacor.com"]);

// Phase TCP1 W2.5 — Solo Bookkeeper launch gate.
// Blocks public reachability to SBK commerce surfaces until Smoke-SBK passes.
// Reversible with SOLO_BK_LAUNCH_GATED=false (or unset). See runbook.
const SOLO_BK_GATED_PATHS = new Set([
  "/pricing",
  "/for/bookkeeper",
  "/signup",
  "/signup/solo-bookkeeper",
]);
const SOLO_BK_GATED_API_PATHS = new Set([
  "/api/checkout/create-session",
]);

function isSoloBkGatedPath(pathname: string): boolean {
  return (
    SOLO_BK_GATED_PATHS.has(pathname) ||
    SOLO_BK_GATED_API_PATHS.has(pathname) ||
    // Any /signup/<subpath> route is gated (covers /signup/solo-bookkeeper deep-link).
    pathname.startsWith("/signup/")
  );
}

// Phase TCP1 W2.5 — Review Assist launch gate.
// Blocks RA-specific paths (signup with plan=review_assist, checkout with
// tier_key=review_assist) until Smoke-RA passes. Symmetric with Solo BK gate
// but scoped by query/body so it does NOT re-gate the already-live SBK surface.
// Reversible with REVIEW_ASSIST_LAUNCH_GATED=false (or unset). See Smoke-RA runbook.
function isReviewAssistSignupRequest(request: NextRequest, pathname: string): boolean {
  if (pathname !== "/signup") return false;
  return request.nextUrl.searchParams.get("plan") === "review_assist";
}

const PUBLIC_MARKETING_PATHS = new Set([
  "/",
  "/about",
  "/privacy",
  "/coming-soon",
  // Marketing v2 nav destinations (D6.5 Part 2).
  "/what-it-does",
  "/how-it-works",
  "/industries",
  "/free-review",
  "/for/owner",
  "/for/bookkeeper",
  "/for/firm",
  // Phase TCP1 W1 — pilot checkout surface (smoke-unblock).
  "/pricing",
  // App routes reachable from marketing hosts (auth + primary product surfaces).
  // Role/auth gating happens inside these routes; middleware only controls reachability.
  "/signin",
  "/signup",
  "/auth/confirmed",
  "/dashboard",
  "/onboarding",
  "/admin",
  "/admin/refunds",
  "/reviewer",
  "/refund-policy",
  "/support",
]);

const PUBLIC_MARKETING_API_PATHS = new Set([
  "/api/early-access",
  "/api/stripe-webhook",
  // Phase TCP1 W1 — waitlist capture for coming-soon SKUs + pilot checkout entrypoint.
  "/api/waitlist",
  "/api/checkout/create-session",
  "/api/onboarding/context",
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
    pathname.startsWith("/reviewer/") ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/onboarding/") ||
    // Public, token-gated close packet share links.
    pathname.startsWith("/share/packet/") ||
    // Allow app API surfaces that need to run for signed-in users on the marketing host.
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/reviewer/") ||
    pathname.startsWith("/api/ar/") ||
    pathname.startsWith("/api/client/") ||
    pathname.startsWith("/api/pulse/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/integrations/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/#")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = normalizedHost(request);

  // Phase TCP1 W2.5 — Solo Bookkeeper launch gate.
  // If gated AND request targets a gated path AND not bypass-allowlisted,
  // redirect UI to /coming-soon and 404 API. Runs before generic marketing
  // allowlist so gate wins even for paths already in PUBLIC_MARKETING_PATHS.
  if (
    MARKETING_HOSTS.has(host) &&
    isSoloBkGated() &&
    isSoloBkGatedPath(pathname) &&
    !isSoloBkBypassAllowed(request)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not available" }, { status: 404 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/coming-soon";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Phase TCP1 W2.5 — Review Assist launch gate.
  // Only /signup?plan=review_assist redirects to /coming-soon.
  // The /api/checkout/create-session gate is enforced inside the route handler
  // (body inspection), not middleware — middleware only sees pathname + query.
  if (
    MARKETING_HOSTS.has(host) &&
    isReviewAssistGated() &&
    isReviewAssistSignupRequest(request, pathname) &&
    !isReviewAssistBypassAllowed(request)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/coming-soon";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Persist RA bypass token as cookie once presented via ?internal=<token>.
  if (
    MARKETING_HOSTS.has(host) &&
    isReviewAssistGated() &&
    hasReviewAssistBypassToken(request) &&
    !hasReviewAssistBypassCookie(request) &&
    isReviewAssistSignupRequest(request, pathname)
  ) {
    const expected = (process.env.REVIEW_ASSIST_INTERNAL_TOKEN ?? "").trim();
    const response = NextResponse.next();
    response.cookies.set({
      name: REVIEW_ASSIST_GATE_COOKIE,
      value: expected,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  }

  // Phase TCP1 W2.5 — Persist bypass token as cookie once presented via query.
  // So an approved reviewer only needs ?internal=<token> once per session.
  if (
    MARKETING_HOSTS.has(host) &&
    isSoloBkGated() &&
    hasSoloBkBypassToken(request) &&
    !hasSoloBkBypassCookie(request)
  ) {
    const expected = (process.env.SOLO_BK_INTERNAL_TOKEN ?? "").trim();
    const response = NextResponse.next();
    response.cookies.set({
      name: SOLO_BK_GATE_COOKIE,
      value: expected,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }

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
