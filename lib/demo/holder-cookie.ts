/**
 * DEMO-3B — Signed cookie helpers for super-admin OAuth-as-holder.
 *
 * The holder user_id must survive the round-trip through Intuit's redirect.
 * We can't rely on the Supabase JWT (that belongs to the super-admin, not
 * the holder). Instead we HMAC-sign the holder user_id with a dedicated
 * env-var-derived key and store it as a cookie during the OAuth flow.
 *
 * Format: <userId>.<hmac_hex>
 *
 * The signing key is DEMO_OAUTH_SIGNING_KEY. If missing at runtime, sign()
 * throws and verify() returns null — this is intentional so a misconfigured
 * environment fails loudly rather than silently accepting unsigned cookies.
 */

import crypto from "crypto";

const COOKIE_NAME = "qb_oauth_holder_user_id";

function requireSigningKey(): string {
  const key = process.env.DEMO_OAUTH_SIGNING_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "DEMO_OAUTH_SIGNING_KEY is not configured (min 32 chars). Set it in Vercel env before using super-admin holder OAuth.",
    );
  }
  return key;
}

export function signHolderUserId(userId: string): string {
  if (!userId || typeof userId !== "string") {
    throw new Error("signHolderUserId requires a non-empty string");
  }
  const key = requireSigningKey();
  const hmac = crypto.createHmac("sha256", key).update(userId).digest("hex");
  return `${userId}.${hmac}`;
}

export function verifyHolderUserIdCookie(cookieValue: string | null | undefined): string | null {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const idx = cookieValue.lastIndexOf(".");
  if (idx <= 0 || idx === cookieValue.length - 1) return null;
  const userId = cookieValue.slice(0, idx);
  const hmac = cookieValue.slice(idx + 1);
  if (!userId || !hmac || hmac.length !== 64) return null;

  let expectedHmac: string;
  try {
    const key = requireSigningKey();
    expectedHmac = crypto.createHmac("sha256", key).update(userId).digest("hex");
  } catch {
    return null;
  }

  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(expectedHmac, "hex");
  if (a.length !== b.length) return null;
  try {
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
}

export const HOLDER_USER_ID_COOKIE_NAME = COOKIE_NAME;
