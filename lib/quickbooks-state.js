import crypto from "crypto";

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createQuickBooksState(supabaseJWT) {
  if (!supabaseJWT) {
    throw new Error("Supabase JWT is required to create QuickBooks OAuth state");
  }

  return base64UrlEncode(
    JSON.stringify({
      token: supabaseJWT,
      nonce: crypto.randomUUID(),
    }),
  );
}

export function verifyQuickBooksState(state) {
  if (!state) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(String(state)));
    if (!parsed.token || !parsed.nonce) return null;
    return parsed;
  } catch {
    return null;
  }
}
