/**
 * Phase TCP1 W2.5 — shared launch-gate bypass helpers.
 *
 * Extracted from middleware.ts so API routes (specifically
 * app/api/checkout/create-session/route.ts) enforce the SAME bypass logic
 * as the middleware. Previously the API route only checked the env var,
 * causing 404 "Not available" for internal reviewers who had valid bypass
 * cookies/tokens set by the middleware.
 *
 * Both middleware.ts and API route handlers import from here.
 * NEVER duplicate this logic in another file — always import.
 */
import type { NextRequest } from "next/server";

// Cookie names must stay in sync with middleware.ts (single source of truth here).
export const SOLO_BK_GATE_COOKIE = "advisacor_solo_bk_gate";
export const REVIEW_ASSIST_GATE_COOKIE = "advisacor_review_assist_gate";

function extractClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "";
}

// ────────── Solo Bookkeeper gate ──────────

export function isSoloBkGated(): boolean {
  return (process.env.SOLO_BK_LAUNCH_GATED ?? "").toLowerCase() === "true";
}

function isSoloBkAllowlistedIp(request: NextRequest): boolean {
  const allow = (process.env.SOLO_BK_ALLOWED_IPS ?? "").trim();
  if (!allow) return false;
  const allowSet = new Set(allow.split(",").map((s) => s.trim()).filter(Boolean));
  const ip = extractClientIp(request);
  return ip.length > 0 && allowSet.has(ip);
}

/** Exported for middleware cookie-persistence (set cookie only when token present). */
export function hasSoloBkBypassToken(request: NextRequest): boolean {
  const expected = (process.env.SOLO_BK_INTERNAL_TOKEN ?? "").trim();
  if (!expected) return false;
  const supplied = request.nextUrl.searchParams.get("internal");
  return supplied === expected;
}

/** Exported for middleware cookie-persistence. */
export function hasSoloBkBypassCookie(request: NextRequest): boolean {
  const expected = (process.env.SOLO_BK_INTERNAL_TOKEN ?? "").trim();
  if (!expected) return false;
  const cookieValue = request.cookies.get(SOLO_BK_GATE_COOKIE)?.value;
  return cookieValue === expected;
}

export function isSoloBkBypassAllowed(request: NextRequest): boolean {
  return (
    isSoloBkAllowlistedIp(request) ||
    hasSoloBkBypassToken(request) ||
    hasSoloBkBypassCookie(request)
  );
}

// ────────── Review Assist gate ──────────

export function isReviewAssistGated(): boolean {
  return (process.env.REVIEW_ASSIST_LAUNCH_GATED ?? "").toLowerCase() === "true";
}

function isReviewAssistAllowlistedIp(request: NextRequest): boolean {
  const allow = (process.env.REVIEW_ASSIST_ALLOWED_IPS ?? "").trim();
  if (!allow) return false;
  const allowSet = new Set(allow.split(",").map((s) => s.trim()).filter(Boolean));
  const ip = extractClientIp(request);
  return ip.length > 0 && allowSet.has(ip);
}

/** Exported for middleware cookie-persistence (set cookie only when token present). */
export function hasReviewAssistBypassToken(request: NextRequest): boolean {
  const expected = (process.env.REVIEW_ASSIST_INTERNAL_TOKEN ?? "").trim();
  if (!expected) return false;
  const supplied = request.nextUrl.searchParams.get("internal");
  return supplied === expected;
}

/** Exported for middleware cookie-persistence. */
export function hasReviewAssistBypassCookie(request: NextRequest): boolean {
  const expected = (process.env.REVIEW_ASSIST_INTERNAL_TOKEN ?? "").trim();
  if (!expected) return false;
  const cookieValue = request.cookies.get(REVIEW_ASSIST_GATE_COOKIE)?.value;
  return cookieValue === expected;
}

export function isReviewAssistBypassAllowed(request: NextRequest): boolean {
  return (
    isReviewAssistAllowlistedIp(request) ||
    hasReviewAssistBypassToken(request) ||
    hasReviewAssistBypassCookie(request)
  );
}
