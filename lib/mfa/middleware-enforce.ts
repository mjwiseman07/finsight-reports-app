import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { decodeJwtPayload, isMfaSensitivePath } from "@/lib/mfa/paths";

function readAccessToken(request: NextRequest): string | null {
  const raw = request.cookies.get(ADVISACOR_ACCESS_TOKEN_COOKIE)?.value;
  if (!raw) {
    const auth = request.headers.get("authorization") || "";
    if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim() || null;
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function redirectTo(request: NextRequest, pathname: string, search?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (search) {
    for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

function unauthorizedApi(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * AAL2 / firm_admin MFA enforcement for sensitive routes.
 * Returns a NextResponse when the request must be redirected/blocked;
 * null when the request may proceed.
 */
export async function enforceMfaForRequest(
  request: NextRequest,
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  if (!isMfaSensitivePath(pathname)) return null;

  const isApi = pathname.startsWith("/api/");
  const token = readAccessToken(request);

  if (!token) {
    if (isApi) return unauthorizedApi("Authentication required");
    return redirectTo(request, "/signin", {
      next: `${pathname}${request.nextUrl.search}`,
    });
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.sub) {
    if (isApi) return unauthorizedApi("Invalid session");
    return redirectTo(request, "/signin");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    // Fail open for host allowlist continuity if service role is missing in
    // a misconfigured local env — route handlers still enforce auth.
    console.warn("[mfa-middleware] SUPABASE_SERVICE_ROLE_KEY missing; skipping MFA gate");
    return null;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = payload.sub;
  const aal = payload.aal === "aal2" ? "aal2" : "aal1";

  const { data: memberships } = await admin
    .from("firm_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "firm_admin")
    .eq("status", "active")
    .limit(1);

  const isFirmAdmin = (memberships?.length ?? 0) > 0;

  // Second-factor detection
  let hasTotp = false;
  try {
    const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId });
    hasTotp = (factors?.factors ?? []).some(
      (f) => f.factor_type === "totp" && f.status === "verified",
    );
  } catch (err) {
    console.error("[mfa-middleware] listFactors failed", err);
  }

  let hasWebAuthn = false;
  try {
    const { count } = await admin
      .from("user_webauthn_credentials")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    hasWebAuthn = (count ?? 0) > 0;
  } catch (err) {
    console.error("[mfa-middleware] webauthn lookup failed", err);
  }

  const hasSecondFactor = hasTotp || hasWebAuthn;

  // Trusted-device / short-lived MFA-verified cookies skip the challenge redirect.
  let deviceTrusted = false;
  let sessionMfaVerified = false;
  try {
    const {
      isTrustedDevice,
      trustedDeviceCookieName,
      mfaVerifiedCookieName,
      verifyMfaVerifiedCookie,
    } = await import("@/lib/mfa/trusted-devices");
    const cookieValue = request.cookies.get(trustedDeviceCookieName())?.value;
    if (cookieValue) {
      deviceTrusted = await isTrustedDevice(userId, cookieValue);
    }
    const verifiedRaw = request.cookies.get(mfaVerifiedCookieName())?.value;
    sessionMfaVerified = await verifyMfaVerifiedCookie(verifiedRaw, userId);
  } catch (err) {
    console.error("[mfa-middleware] trusted device check failed", err);
  }

  const challengeSatisfied = aal === "aal2" || deviceTrusted || sessionMfaVerified;

  if (isFirmAdmin && !hasSecondFactor) {
    if (isApi) {
      return unauthorizedApi(
        "Two-factor authentication enrollment required for firm administrators",
        403,
      );
    }
    return redirectTo(request, "/dashboard/account/security", {
      enforcement: "required",
    });
  }

  if (isFirmAdmin && hasSecondFactor && !challengeSatisfied) {
    if (isApi) return unauthorizedApi("AAL2 required", 403);
    return redirectTo(request, "/signin/mfa-challenge", { returnTo: pathname });
  }

  if (!isFirmAdmin && hasSecondFactor && !challengeSatisfied) {
    if (isApi) return unauthorizedApi("AAL2 required", 403);
    return redirectTo(request, "/signin/mfa-challenge", { returnTo: pathname });
  }

  return null;
}
