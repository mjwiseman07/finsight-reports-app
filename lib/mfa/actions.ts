"use server";

import QRCode from "qrcode";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/mfa/crypto";
import {
  clearMfaChallengeFailures,
  getMfaChallengeLockState,
  recordMfaChallengeFailure,
} from "@/lib/mfa/challenge-rate-limit";
import {
  createMfaUserClient,
  getRequestAuditContext,
  type MfaResult,
  userHasActiveFirmAdminRole,
  writeMfaAuditLog,
} from "@/lib/mfa/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function requireUser() {
  const supabase = await createMfaUserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null as null, error: "Unauthorized" };
  }
  return { supabase, user, error: null as null };
}

export async function enrollTotpFactor(): Promise<
  MfaResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const ctx = await getRequestAuditContext();
  try {
    const { supabase, user, error } = await requireUser();
    if (error || !user) return { ok: false, error: error ?? "Unauthorized" };

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Advisacor Authenticator",
    });

    if (enrollError || !data) {
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "enroll_failed",
        metadata: { reason: enrollError?.message ?? "enroll_returned_empty" },
        ...ctx,
      });
      return { ok: false, error: enrollError?.message ?? "Failed to start MFA enrollment" };
    }

    const secret = data.totp.secret;
    const uri = data.totp.uri;
    // Prefer a PNG data URL for <img src>; fall back to Supabase SVG string.
    let qrCode: string;
    try {
      qrCode = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
    } catch {
      qrCode = data.totp.qr_code.startsWith("data:")
        ? data.totp.qr_code
        : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.totp.qr_code)}`;
    }

    await writeMfaAuditLog({
      userId: user.id,
      eventType: "enroll_started",
      metadata: { factorId: data.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      ok: true,
      data: { factorId: data.id, qrCode, secret },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to start MFA enrollment",
    };
  }
}

export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<MfaResult<{ recoveryCodes: string[] }>> {
  const ctx = await getRequestAuditContext();
  try {
    const { supabase, user, error } = await requireUser();
    if (error || !user) return { ok: false, error: error ?? "Unauthorized" };

    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "enroll_failed",
        metadata: { reason: "invalid_code_format", factorId },
        ...ctx,
      });
      return { ok: false, error: "Enter the 6-digit code from your authenticator app." };
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "enroll_failed",
        metadata: { reason: challengeError?.message ?? "challenge_failed", factorId },
        ...ctx,
      });
      return { ok: false, error: challengeError?.message ?? "Could not create MFA challenge" };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: trimmed,
    });

    if (verifyError) {
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "enroll_failed",
        metadata: { reason: verifyError.message, factorId },
        ...ctx,
      });
      return { ok: false, error: verifyError.message || "Invalid verification code" };
    }

    const { plaintext, hashes } = generateRecoveryCodes(10);
    const admin = getSupabaseAdmin();
    // Invalidate any prior unused codes before inserting the new set.
    await admin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    const rows = hashes.map((code_hash) => ({
      user_id: user.id,
      code_hash,
    }));
    const { error: insertError } = await admin.from("mfa_recovery_codes").insert(rows);
    if (insertError) {
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "enroll_failed",
        metadata: { reason: insertError.message, stage: "recovery_codes_persist" },
        ...ctx,
      });
      return { ok: false, error: "Enrollment verified but recovery codes failed to save. Contact support." };
    }

    await writeMfaAuditLog({
      userId: user.id,
      eventType: "enroll_completed",
      metadata: { factorId, recoveryCodeCount: plaintext.length },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ok: true, data: { recoveryCodes: plaintext } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to verify MFA enrollment",
    };
  }
}

export async function disableTotpFactor(factorId: string): Promise<MfaResult<{ disabled: true }>> {
  const ctx = await getRequestAuditContext();
  try {
    const { supabase, user, error } = await requireUser();
    if (error || !user) return { ok: false, error: error ?? "Unauthorized" };

    if (await userHasActiveFirmAdminRole(user.id)) {
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "disable",
        metadata: { blocked: true, reason: "firm_admin_required", factorId },
        ...ctx,
      });
      return {
        ok: false,
        error: "Firm administrators cannot disable two-factor authentication.",
      };
    }

    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      return { ok: false, error: unenrollError.message || "Failed to disable MFA" };
    }

    const admin = getSupabaseAdmin();
    await admin.from("mfa_recovery_codes").delete().eq("user_id", user.id);

    await writeMfaAuditLog({
      userId: user.id,
      eventType: "disable",
      metadata: { factorId },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ok: true, data: { disabled: true } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to disable MFA",
    };
  }
}

export async function regenerateRecoveryCodes(): Promise<
  MfaResult<{ recoveryCodes: string[] }>
> {
  const ctx = await getRequestAuditContext();
  try {
    const { supabase, user, error } = await requireUser();
    if (error || !user) return { ok: false, error: error ?? "Unauthorized" };

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      return { ok: false, error: "AAL2 session required to regenerate recovery codes." };
    }

    const { plaintext, hashes } = generateRecoveryCodes(10);
    const admin = getSupabaseAdmin();
    await admin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null);

    const { error: insertError } = await admin.from("mfa_recovery_codes").insert(
      hashes.map((code_hash) => ({ user_id: user.id, code_hash })),
    );
    if (insertError) {
      return { ok: false, error: insertError.message || "Failed to save new recovery codes" };
    }

    await writeMfaAuditLog({
      userId: user.id,
      eventType: "recovery_codes_regenerated",
      metadata: { recoveryCodeCount: plaintext.length },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ok: true, data: { recoveryCodes: plaintext } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to regenerate recovery codes",
    };
  }
}

/**
 * Consume a one-time recovery code. On success, removes all TOTP factors via
 * the Admin API so the user can re-enroll (AAL2 cannot be forged without a
 * factor verify; lost-device recovery resets MFA instead).
 */
export async function consumeRecoveryCode(
  userId: string,
  code: string,
): Promise<MfaResult<{ consumed: true; requiresReenroll: true }>> {
  const ctx = await getRequestAuditContext();
  try {
    if (!userId || !code?.trim()) {
      return { ok: false, error: "Missing recovery code" };
    }

    const lock = getMfaChallengeLockState(userId);
    if (lock.locked) {
      return {
        ok: false,
        error: `Too many failed attempts. Try again in ${lock.retryAfterSeconds} seconds.`,
      };
    }

    const codeHash = hashRecoveryCode(code);
    const admin = getSupabaseAdmin();
    const { data: match, error: lookupError } = await admin
      .from("mfa_recovery_codes")
      .select("id")
      .eq("user_id", userId)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .maybeSingle();

    if (lookupError || !match) {
      const fail = recordMfaChallengeFailure(userId);
      await writeMfaAuditLog({
        userId,
        eventType: "verify_failed",
        metadata: { reason: "recovery_code_invalid", locked: fail.locked },
        ...ctx,
      });
      if (fail.locked) {
        return {
          ok: false,
          error: `Too many failed attempts. Try again in ${fail.retryAfterSeconds} seconds.`,
        };
      }
      return { ok: false, error: "Invalid or already-used recovery code" };
    }

    const { error: markError } = await admin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", match.id)
      .is("used_at", null);

    if (markError) {
      return { ok: false, error: "Failed to consume recovery code" };
    }

    // Invalidate remaining unused codes and strip factors so the attacker
    // cannot reuse leftover recovery material after a lost-device event.
    await admin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("used_at", null);

    const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId });
    for (const factor of factors?.factors ?? []) {
      await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    }

    clearMfaChallengeFailures(userId);
    await writeMfaAuditLog({
      userId,
      eventType: "recovery_code_used",
      metadata: { factorsRemoved: factors?.factors?.length ?? 0 },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { ok: true, data: { consumed: true, requiresReenroll: true } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to consume recovery code",
    };
  }
}

export async function verifyMfaChallenge(
  code: string,
): Promise<MfaResult<{ accessToken: string; expiresIn: number }>> {
  const ctx = await getRequestAuditContext();
  try {
    const { supabase, user, error } = await requireUser();
    if (error || !user) return { ok: false, error: error ?? "Unauthorized" };

    const lock = getMfaChallengeLockState(user.id);
    if (lock.locked) {
      return {
        ok: false,
        error: `Too many failed attempts. Try again in ${lock.retryAfterSeconds} seconds.`,
      };
    }

    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      return { ok: false, error: "Enter the 6-digit code from your authenticator app." };
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      return { ok: false, error: factorsError.message };
    }
    const totp = factors?.totp?.[0];
    if (!totp) {
      return { ok: false, error: "No TOTP factor enrolled on this account." };
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (challengeError || !challenge) {
      return { ok: false, error: challengeError?.message ?? "Could not create MFA challenge" };
    }

    const { data: verified, error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: trimmed,
    });

    if (verifyError || !verified) {
      const fail = recordMfaChallengeFailure(user.id);
      await writeMfaAuditLog({
        userId: user.id,
        eventType: "verify_failed",
        metadata: { reason: verifyError?.message ?? "verify_failed", locked: fail.locked },
        ...ctx,
      });
      if (fail.locked) {
        return {
          ok: false,
          error: `Too many failed attempts. Try again in ${fail.retryAfterSeconds} seconds.`,
        };
      }
      return { ok: false, error: verifyError?.message || "Invalid verification code" };
    }

    clearMfaChallengeFailures(user.id);
    await writeMfaAuditLog({
      userId: user.id,
      eventType: "verify_success",
      metadata: { factorId: totp.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const accessToken = verified.access_token;
    const expiresIn = verified.expires_in ?? 3600;
    if (!accessToken) {
      return { ok: false, error: "MFA verified but no access token returned" };
    }

    return { ok: true, data: { accessToken, expiresIn } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to verify MFA challenge",
    };
  }
}

export async function logAdminEnforcementPrompted(): Promise<void> {
  try {
    const { user } = await requireUser();
    if (!user) return;
    const ctx = await getRequestAuditContext();
    await writeMfaAuditLog({
      userId: user.id,
      eventType: "admin_enforcement_prompted",
      metadata: {},
      ...ctx,
    });
  } catch {
    // non-fatal
  }
}
