import crypto from "crypto";

const INTAKE_DOMAIN = "intake.advisacor.com";
const TOKEN_SECRET_ENV = "INTAKE_ADDRESS_TOKEN_SECRET";
const TOKEN_LENGTH = 6;

export type HandlerKey = "cash_app_remit" | "bills" | "docs";

export const KNOWN_HANDLER_PREFIXES: Record<string, HandlerKey> = {
  remit: "cash_app_remit",
  bills: "bills",
  docs: "docs",
};

export interface ParsedIntakeAddress {
  prefix: string;
  firmSlug: string | null;
  token: string | null;
  domain: string;
}

/**
 * Parse an inbound recipient like `bills+acme-a7f3k2@intake.advisacor.com`
 * or a bare `intake@intake.advisacor.com`.
 * Returns null if the recipient is not on the intake domain.
 */
export function parseIntakeAddress(recipient: string): ParsedIntakeAddress | null {
  const lowered = recipient.trim().toLowerCase();
  const at = lowered.lastIndexOf("@");
  if (at < 0) return null;
  const local = lowered.slice(0, at);
  const domain = lowered.slice(at + 1);
  if (domain !== INTAKE_DOMAIN) return null;

  const plusIdx = local.indexOf("+");
  if (plusIdx < 0) {
    return { prefix: local, firmSlug: null, token: null, domain };
  }

  const prefix = local.slice(0, plusIdx);
  const rest = local.slice(plusIdx + 1);
  const dashIdx = rest.lastIndexOf("-");
  if (dashIdx < 0) {
    return { prefix, firmSlug: rest, token: null, domain };
  }

  const firmSlug = rest.slice(0, dashIdx);
  const token = rest.slice(dashIdx + 1);
  return { prefix, firmSlug, token, domain };
}

function getSecret(): string {
  const s = process.env[TOKEN_SECRET_ENV];
  if (!s || s.length < 16) {
    throw new Error(
      `${TOKEN_SECRET_ENV} not set or too short (min 16 chars) — cannot verify intake addresses`,
    );
  }
  return s;
}

function base32Crockford(buf: Buffer): string {
  const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
  let out = "";
  for (const b of buf) {
    out += alphabet[b % 32];
  }
  return out;
}

export function deriveToken(handler: HandlerKey, firmSlug: string, companyId: string): string {
  const secret = getSecret();
  const mac = crypto.createHmac("sha256", secret).update(`${handler}|${firmSlug}|${companyId}`).digest();
  return base32Crockford(mac.subarray(0, TOKEN_LENGTH));
}

export function verifyToken(
  handler: HandlerKey,
  firmSlug: string,
  companyId: string,
  provided: string,
): boolean {
  if (!provided || provided.length !== TOKEN_LENGTH) return false;
  const expected = deriveToken(handler, firmSlug, companyId);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildFullAddress(handler: HandlerKey, firmSlug: string, token: string): string {
  const prefix = Object.entries(KNOWN_HANDLER_PREFIXES).find(([, k]) => k === handler)?.[0];
  if (!prefix) throw new Error(`Unknown handler key: ${handler}`);
  return `${prefix}+${firmSlug}-${token}@${INTAKE_DOMAIN}`;
}

export function isValidFirmSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug);
}
