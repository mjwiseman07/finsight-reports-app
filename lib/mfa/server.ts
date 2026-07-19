import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MfaAuditEventType as SharedMfaAuditEventType } from "@/types/mfa";
import { userHasWebAuthn } from "@/lib/mfa/webauthn";

export type MfaResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type MfaAuditEventType = SharedMfaAuditEventType;

export { userHasWebAuthn };

/**
 * Prefer @supabase/ssr cookie jar; fall back to Advisacor access-token cookie
 * (same pattern as reviewer auth / admin routes).
 */
export async function createMfaUserClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const ssr = createServerClient(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Read-only cookie context (Server Component) — ignore.
        }
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // ignore
        }
      },
    },
  });

  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (user) return ssr;

  const raw = cookieStore.get(ADVISACOR_ACCESS_TOKEN_COOKIE)?.value;
  if (!raw) return ssr;
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    token = raw;
  }

  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getRequestAuditContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") || "";
  const ipAddress =
    forwarded.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");
  return { ipAddress, userAgent };
}

export async function writeMfaAuditLog(input: {
  userId: string;
  eventType: MfaAuditEventType;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("mfa_audit_log").insert({
      user_id: input.userId,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[mfa] audit log write failed", err);
  }
}

export async function userHasActiveFirmAdminRole(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("firm_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "firm_admin")
    .eq("status", "active")
    .limit(1);
  if (error) {
    console.error("[mfa] firm_admin lookup failed", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function getUserFromRequest(_request?: Request): Promise<User | null> {
  const supabase = await createMfaUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function logMfaEvent(input: {
  userId: string;
  eventType: MfaAuditEventType;
  request?: Request;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const ctx = await getRequestAuditContext();
  await writeMfaAuditLog({
    userId: input.userId,
    eventType: input.eventType,
    metadata: input.metadata,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
}

export async function userHasAnySecondFactor(userId: string): Promise<boolean> {
  const [hasWebAuthnFactor, factorList] = await Promise.all([
    userHasWebAuthn(userId),
    getSupabaseAdmin().auth.admin.mfa.listFactors({ userId }),
  ]);
  const hasTotp = (factorList.data?.factors ?? []).some(
    (f: { factor_type?: string; status?: string }) =>
      f.factor_type === "totp" && f.status === "verified",
  );
  return hasWebAuthnFactor || hasTotp;
}
