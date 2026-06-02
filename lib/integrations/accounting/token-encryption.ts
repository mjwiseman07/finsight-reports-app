import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";

function getEncryptionKey() {
  const secret = process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptAccountingToken(token: string | null | undefined) {
  if (!token) return null;
  if (token.startsWith(ENCRYPTION_PREFIX)) return token;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString("base64url")}`;
}

export function decryptAccountingToken(token: string | null | undefined) {
  if (!token) return null;
  if (!token.startsWith(ENCRYPTION_PREFIX)) return token;

  const payload = Buffer.from(token.slice(ENCRYPTION_PREFIX.length), "base64url");
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
