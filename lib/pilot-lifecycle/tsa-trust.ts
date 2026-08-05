/**
 * Phase MEM_LIFECYCLE Block 9.1 — TSA root trust store.
 *
 * Hash-pinning: chain-terminal certs are matched against SHA-256(DER) of bundled
 * PEMs. DN-pinning is NOT used.
 *
 * Trust set is APPEND-ONLY: adding roots for rotation is fine; removing them
 * would retroactively invalidate historical anchors.
 */

import { TRUSTED_ROOTS, TRUSTED_ROOT_FINGERPRINTS } from "./generated/tsa-trust-bundle";

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const buf = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(buf);
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += x.toString(16).padStart(2, "0");
  return s;
}

/** Fingerprint a DER cert (SHA-256 hex, lowercase, 64 chars). */
export async function fingerprintCertDer(der: Uint8Array): Promise<string> {
  return bytesToHex(await sha256(der));
}

/** Constant-time byte-array equality. */
function bytesEqualConstantTime(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Is this DER a byte-for-byte match against ANY of the bundled trusted root certs? */
export function isTrustedRootExactBytes(
  der: Uint8Array,
): { trusted: boolean; matchedFilename?: string } {
  for (const root of TRUSTED_ROOTS) {
    if (bytesEqualConstantTime(der, root.der)) {
      return { trusted: true, matchedFilename: root.filename };
    }
  }
  return { trusted: false };
}

/** Is a computed SHA-256 fingerprint in the pin set? */
export function isTrustedFingerprint(fingerprintHex: string): boolean {
  return TRUSTED_ROOT_FINGERPRINTS.has(fingerprintHex.toLowerCase());
}

/** Number of trusted roots bundled — sanity check for tests/callers. */
export function trustedRootCount(): number {
  return TRUSTED_ROOTS.length;
}

export { TRUSTED_ROOTS };
