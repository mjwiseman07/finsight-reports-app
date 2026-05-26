import crypto from "crypto";

function getStateSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.QB_CLIENT_SECRET || "finsight-dev-state-secret";
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload) {
  return crypto.createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
}

export function createQuickBooksState(userId) {
  const payload = base64UrlEncode(
    JSON.stringify({
      userId,
      iat: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyQuickBooksState(state) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload));
    const maxAgeMs = 15 * 60 * 1000;
    if (!parsed.userId || !parsed.iat || Date.now() - parsed.iat > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}
