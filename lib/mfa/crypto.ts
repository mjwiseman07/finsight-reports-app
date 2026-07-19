import crypto from "crypto";

/**
 * MFA recovery-code helpers (SHA-256 at rest).
 * Codes are formatted XXXX-XXXX-XXXX-XXXX for human readability;
 * hashing always strips dashes and uppercases for consistent matching.
 */
export function generateRecoveryCode(): string {
  const raw = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function hashRecoveryCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function generateRecoveryCodes(count = 10): {
  plaintext: string[];
  hashes: string[];
} {
  const plaintext = Array.from({ length: count }, generateRecoveryCode);
  const hashes = plaintext.map(hashRecoveryCode);
  return { plaintext, hashes };
}
