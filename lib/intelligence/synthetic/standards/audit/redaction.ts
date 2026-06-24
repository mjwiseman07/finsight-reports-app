import { createHash } from "node:crypto";

const SENSITIVE_FIELD_NAMES = new Set([
  "email",
  "ssn",
  "dob",
  "phone",
  "address",
  "name",
  "patientId",
  "mrn",
  "policyNumber",
]);

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/;

function hashValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

function looksSensitive(value: string): boolean {
  return SSN_PATTERN.test(value) || CREDIT_CARD_PATTERN.test(value);
}

export function redactCacheKey(cacheKey: string): string {
  return hashValue(cacheKey);
}

export function redactPayload(
  value: unknown,
  depth = 0,
): unknown {
  if (value === undefined) {
    return null;
  }
  if (value === null || typeof value !== "object") {
    if (typeof value === "string") {
      if (looksSensitive(value)) {
        return hashValue(value);
      }
      if (value.length > 256) {
        return `${value.slice(0, 256)}…`;
      }
    }
    return value;
  }
  if (depth >= 10) {
    return { "@truncated": "depth-limit" };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactPayload(entry, depth + 1));
  }
  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (SENSITIVE_FIELD_NAMES.has(key) && typeof entry === "string") {
      redacted[key] = hashValue(entry);
      continue;
    }
    if (typeof entry === "string" && looksSensitive(entry)) {
      redacted[key] = hashValue(entry);
      continue;
    }
    redacted[key] = redactPayload(entry, depth + 1);
  }
  return Object.freeze(redacted);
}
