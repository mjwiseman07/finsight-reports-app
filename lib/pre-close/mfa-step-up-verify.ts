/**
 * Gap 3 — verify request has fresh MFA within step-up window (15 min).
 * Reads the Gap 1b advisacor_mfa_verified cookie bound to the verified session.
 */
import { cookies } from "next/headers";
import {
  mfaVerifiedCookieName,
  parseMfaStepUpReceiptPayload,
  verifyMfaVerifiedCookie,
} from "@/lib/mfa/trusted-devices";
import { resolveVerifiedSupabaseSession } from "@/lib/mfa/verified-session";
import { MFA_STEP_UP_WINDOW_MS } from "@/lib/pre-close/require-approval";

export type MfaStepUpCheckResult =
  | { ok: true; verifiedAt: Date; method: "totp" | "webauthn" }
  | {
      ok: false;
      reason:
        | "no_session"
        | "no_cookie"
        | "invalid_signature"
        | "expired"
        | "user_mismatch"
        | "session_mismatch";
    };

const MFA_VERIFIED_MAX_AGE_MS = 60 * 60 * 1000;

export async function verifyMfaStepUpForRequest(
  userId: string,
): Promise<MfaStepUpCheckResult> {
  const session = await resolveVerifiedSupabaseSession(userId);
  if (!session) return { ok: false, reason: "no_session" };

  const cookieStore = await cookies();
  const raw = cookieStore.get(mfaVerifiedCookieName())?.value;
  if (!raw) return { ok: false, reason: "no_cookie" };

  const parsed = parseMfaStepUpReceiptPayload(raw);
  if (!parsed) return { ok: false, reason: "invalid_signature" };
  if (parsed.userId !== userId) return { ok: false, reason: "user_mismatch" };
  if (parsed.sessionId !== session.sessionId) {
    return { ok: false, reason: "session_mismatch" };
  }

  const valid = await verifyMfaVerifiedCookie(raw, {
    userId: session.userId,
    sessionId: session.sessionId,
  });
  if (!valid) {
    if (Date.now() > parsed.expiresAtMs) return { ok: false, reason: "expired" };
    return { ok: false, reason: "invalid_signature" };
  }

  if (Date.now() - parsed.issuedAtMs > MFA_STEP_UP_WINDOW_MS) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    verifiedAt: new Date(parsed.issuedAtMs),
    method: parsed.method,
  };
}
