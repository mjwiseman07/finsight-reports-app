// File: lib/demo/impersonation.ts
//
// Impersonation cookie helpers for the super-admin demo picker. The cookie
// carries the demo firm_id that super-admin is currently "assuming." Read by
// firm-scoped API routes as an override (DEMO-3A only sets it; wiring the
// downstream reads is handled in DEMO-3B or the smoke runbook itself, since
// most existing routes already accept firm_id from the request body or params
// and only need a small selector helper).
//
// httpOnly, secure, sameSite=lax, 4-hour TTL. Only ever set/read by
// super-admin-gated routes.

import type { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const ADVISACOR_IMPERSONATE_FIRM_COOKIE = "advisacor_impersonate_firm_id";
export const ADVISACOR_IMPERSONATE_COOKIE_MAX_AGE_SECONDS = 4 * 60 * 60;

export function setImpersonationCookie(response: NextResponse, firmId: string): void {
  response.cookies.set(ADVISACOR_IMPERSONATE_FIRM_COOKIE, firmId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADVISACOR_IMPERSONATE_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearImpersonationCookie(response: NextResponse): void {
  response.cookies.set(ADVISACOR_IMPERSONATE_FIRM_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readImpersonationCookieFromRequest(
  request: NextRequest | Request,
): string | null {
  const cookieHeader =
    typeof (request as NextRequest).cookies?.get === "function"
      ? (request as NextRequest).cookies.get(ADVISACOR_IMPERSONATE_FIRM_COOKIE)?.value ?? null
      : parseCookieHeader((request as Request).headers.get("cookie") || "");

  return cookieHeader && typeof cookieHeader === "string" && cookieHeader.length > 0
    ? cookieHeader
    : null;
}

function parseCookieHeader(cookieHeader: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADVISACOR_IMPERSONATE_FIRM_COOKIE}=([^;]+)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
