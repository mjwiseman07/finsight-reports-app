/**
 * Gap 3 — verify request has fresh MFA within step-up window (15 min).
 * Reads the Gap 1b advisacor_mfa_verified cookie.
 */
import { cookies } from "next/headers";
import {
  mfaVerifiedCookieName,
  verifyMfaVerifiedCookie,
} from "@/lib/mfa/trusted-devices";
import { MFA_STEP_UP_WINDOW_MS } from "@/lib/pre-close/require-approval";

export type MfaStepUpCheckResult =
  | { ok: true; verifiedAt: Date; method: "totp" | "webauthn" }
  | { ok: false; reason: "no_cookie" | "invalid_signature" | "expired" | "user_mismatch" };

const MFA_VERIFIED_MAX_AGE_MS = 60 * 60 * 1000;

export async function verifyMfaStepUpForRequest(userId: string): Promise<MfaStepUpCheckResult> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(mfaVerifiedCookieName())?.value;
  if (!raw) return { ok: false, reason: "no_cookie" };

  const valid = await verifyMfaVerifiedCookie(raw, userId);
  if (!valid) {
    // Distinguish user mismatch vs expired/invalid by parsing payload.
    const parsed = parseMfaVerifiedPayload(raw);
    if (!parsed) return { ok: false, reason: "invalid_signature" };
    if (parsed.userId !== userId) return { ok: false, reason: "user_mismatch" };
    return { ok: false, reason: "expired" };
  }

  const parsed = parseMfaVerifiedPayload(raw);
  if (!parsed) return { ok: false, reason: "invalid_signature" };
  if (Date.now() - parsed.issuedAtMs > MFA_STEP_UP_WINDOW_MS) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    verifiedAt: new Date(parsed.issuedAtMs),
    method: parsed.method,
  };
}

function parseMfaVerifiedPayload(raw: string): {
  userId: string;
  issuedAtMs: number;
  method: "totp" | "webauthn";
} | null {
  const lastDot = raw.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = raw.slice(0, lastDot);
  const parts = payload.split(".");
  if (parts.length < 2) return null;
  const userId = parts[0]!;
  const exp = Number(parts[1]);
  if (!userId || !Number.isFinite(exp)) return null;
  const method =
    parts[2] === "webauthn" || parts[2] === "totp" ? (parts[2] as "totp" | "webauthn") : "totp";
  // Cookie payload stores absolute expiry = issuedAt + 1h (Gap 1b).
  const issuedAtMs = exp - MFA_VERIFIED_MAX_AGE_MS;
  return { userId, issuedAtMs, method };
}
