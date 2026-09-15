/**
 * Canonical PBC storage object keys: `{engagementId}/{sha256}-{safeFileName}`
 * Fail closed on traversal, absolute paths, encoding tricks, and cross-engagement prefixes.
 */

const ENGAGEMENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;
const SAFE_NAME_RE = /^[\w.\-]+$/;

export type PbcStorageKeyOk = { ok: true; storagePath: string };
export type PbcStorageKeyDeny = { ok: false };

export function assertPbcStoragePathForEngagement(args: {
  engagementId: string;
  storagePath: unknown;
}): PbcStorageKeyOk | PbcStorageKeyDeny {
  const engagementId = String(args.engagementId || "").trim();
  const raw = String(args.storagePath ?? "");

  if (!ENGAGEMENT_ID_RE.test(engagementId)) return { ok: false };
  if (!raw || raw !== raw.trim()) return { ok: false };

  // Reject absolute / scheme / Windows drive / UNC.
  if (
    raw.startsWith("/") ||
    raw.startsWith("\\") ||
    /^[a-zA-Z]:/.test(raw) ||
    raw.includes("://")
  ) {
    return { ok: false };
  }

  // Reject any encoding / traversal indicators before decode.
  if (
    raw.includes("..") ||
    raw.includes("%") ||
    raw.includes("\\") ||
    raw.includes("\0") ||
    raw.includes("//")
  ) {
    return { ok: false };
  }

  const parts = raw.split("/");
  if (parts.length !== 2) return { ok: false };

  const [prefix, objectName] = parts;
  if (prefix !== engagementId) return { ok: false };
  if (!objectName || objectName.length > 260) return { ok: false };

  const dash = objectName.indexOf("-");
  if (dash !== 64) return { ok: false };
  const sha = objectName.slice(0, 64);
  const filePart = objectName.slice(65);
  if (!SHA256_RE.test(sha)) return { ok: false };
  if (!filePart || !SAFE_NAME_RE.test(filePart)) return { ok: false };
  if (filePart.includes("..")) return { ok: false };

  return { ok: true, storagePath: `${engagementId}/${sha}-${filePart}` };
}
