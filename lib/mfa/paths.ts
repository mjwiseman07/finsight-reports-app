/**
 * Edge-safe MFA path helpers for middleware.
 * No Node crypto / service-role imports — keep this Edge-compatible.
 */

export const MFA_SENSITIVE_PREFIXES = [
  "/dashboard/admin",
  "/admin",
  "/dashboard/settings/firm",
  "/api/quickbooks/connect",
  "/api/integrations/quickbooks/connect",
  "/api/billing",
  "/api/admin",
  "/api/user/delete",
  "/api/checkout/create-session",
] as const;

export const MFA_EXEMPT_PREFIXES = [
  "/api/quickbooks/callback",
  "/api/integrations/quickbooks/callback",
  // Intuit disconnect webhooks authenticate via HMAC, not user AAL2.
  "/api/quickbooks/disconnect",
  "/api/integrations/quickbooks/disconnect",
  "/signin",
  "/signin/mfa-challenge",
  "/dashboard/account/security",
  // WebAuthn challenge routes must be reachable pre-aal2.
  "/api/mfa/webauthn/authenticate/options",
  "/api/mfa/webauthn/authenticate/verify",
  "/api/mfa/factors/summary",
] as const;

export function isMfaExemptPath(pathname: string): boolean {
  return MFA_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isMfaSensitivePath(pathname: string): boolean {
  if (isMfaExemptPath(pathname)) return false;
  return MFA_SENSITIVE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function decodeJwtPayload(token: string): {
  sub?: string;
  aal?: string;
  exp?: number;
} | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as { sub?: string; aal?: string; exp?: number };
  } catch {
    return null;
  }
}
