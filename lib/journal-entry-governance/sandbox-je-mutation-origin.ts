/**
 * Same-origin mutation guard for sandbox JE proposal/approval POSTs.
 * No dedicated CSRF token exists in-repo; Origin/Referer + Sec-Fetch-Site bind browser mutations.
 */

import { NextResponse } from "next/server";

export function sandboxJeMutationOriginDeniedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Cross-origin mutation is forbidden.", code: "sandbox_je_origin_denied" },
    { status: 403 },
  );
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Allow only same-origin browser mutations (or non-browser callers without Origin/Referer
 * that also lack Sec-Fetch-Site cross-site markers — e.g. same-origin fetch omits some
 * headers in older agents; Sec-Fetch-Site=cross-site always denies).
 */
export function assertSandboxJeMutationOrigin(request: Request): NextResponse | null {
  const secFetchSite = (request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (secFetchSite === "cross-site" || secFetchSite === "none") {
    // "none" = user-initiated top-level navigations / curl-like; for POST APIs treat as deny
    // when paired with missing Origin (CSRF-safe default for cookie-auth mutations).
    if (secFetchSite === "cross-site") {
      return sandboxJeMutationOriginDeniedResponse();
    }
  }

  const requestUrl = new URL(request.url);
  const expectedHost = requestUrl.host.toLowerCase();
  const originHost = hostFromUrl(request.headers.get("origin"));
  const refererHost = hostFromUrl(request.headers.get("referer"));

  if (originHost) {
    return originHost === expectedHost ? null : sandboxJeMutationOriginDeniedResponse();
  }
  if (refererHost) {
    return refererHost === expectedHost ? null : sandboxJeMutationOriginDeniedResponse();
  }

  // No Origin/Referer: allow only explicit same-origin Sec-Fetch-Site (modern browsers on POST).
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return null;
  }

  return sandboxJeMutationOriginDeniedResponse();
}
