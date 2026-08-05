/**
 * Phase MEM_LIFECYCLE Block 9.1 — X.509 chain walk (leaf → root) via AKID→SKID.
 *
 * All validity checks are AS-OF TSTInfo.genTime — never Date.now().
 * Deliberate design; NOT claimed as RFC 3161-mandated behavior.
 */

import { AsnParser, AsnSerializer } from "@peculiar/asn1-schema";
import { Certificate } from "@peculiar/asn1-x509";
import type { SignerInfo } from "@peculiar/asn1-cms";
import {
  AuthorityKeyIdentifierExt,
  ExtendedKeyUsageExt,
  SubjectKeyIdentifierExt,
  OID,
} from "./asn1-extensions";
import { fingerprintCertDer, isTrustedRootExactBytes } from "./tsa-trust";

function getExt(cert: Certificate, oid: string) {
  return cert.tbsCertificate.extensions?.find((e) => e.extnID === oid);
}

function getSkidBytes(cert: Certificate): Uint8Array | null {
  const ext = getExt(cert, OID.subjectKeyIdentifier);
  if (!ext) return null;
  try {
    const skid = AsnParser.parse(ext.extnValue.buffer, SubjectKeyIdentifierExt);
    return new Uint8Array(skid.value);
  } catch {
    return null;
  }
}

function getAkidBytes(cert: Certificate): Uint8Array | null {
  const ext = getExt(cert, OID.authorityKeyIdentifier);
  if (!ext) return null;
  try {
    const akid = AsnParser.parse(ext.extnValue.buffer, AuthorityKeyIdentifierExt);
    return akid.keyIdentifier ? new Uint8Array(akid.keyIdentifier) : null;
  } catch {
    return null;
  }
}

function bytesEqual(a: Uint8Array | null, b: Uint8Array | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Split a concatenated cert-chain DER blob back into individual Certificate objects. */
export function splitCertChainDer(chain: Uint8Array): Certificate[] {
  const certs: Certificate[] = [];
  let offset = 0;
  while (offset < chain.length) {
    if (chain[offset] !== 0x30) {
      throw new Error(
        `splitCertChainDer: expected SEQUENCE at offset ${offset}, got 0x${chain[offset].toString(16)}`,
      );
    }
    const lengthByte = chain[offset + 1];
    let contentStart: number;
    let contentLength: number;
    if (lengthByte < 0x80) {
      contentStart = offset + 2;
      contentLength = lengthByte;
    } else {
      const numLenBytes = lengthByte & 0x7f;
      if (numLenBytes === 0 || numLenBytes > 4) {
        throw new Error(
          `splitCertChainDer: unsupported DER length encoding at offset ${offset}`,
        );
      }
      contentStart = offset + 2 + numLenBytes;
      let l = 0;
      for (let i = 0; i < numLenBytes; i++) l = (l << 8) | chain[offset + 2 + i];
      contentLength = l;
    }
    const certEnd = contentStart + contentLength;
    if (certEnd > chain.length) {
      throw new Error(
        `splitCertChainDer: cert extends past chain buffer at offset ${offset}`,
      );
    }
    const certDer = chain.slice(offset, certEnd);
    certs.push(AsnParser.parse(certDer, Certificate));
    offset = certEnd;
  }
  return certs;
}

function bufferSourceToBytes(v: unknown): Uint8Array {
  if (v == null) return new Uint8Array(0);
  if (v instanceof Uint8Array) {
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  if (ArrayBuffer.isView(v)) {
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  if (v instanceof ArrayBuffer) {
    return new Uint8Array(v);
  }
  const duck = v as {
    buffer?: ArrayBuffer;
    byteOffset?: number;
    byteLength?: number;
  };
  if (duck.buffer instanceof ArrayBuffer && typeof duck.byteLength === "number") {
    return new Uint8Array(duck.buffer, duck.byteOffset ?? 0, duck.byteLength);
  }
  return new Uint8Array(0);
}

/** Find the leaf/signer cert in the chain by matching SignerInfo.sid. */
export function findSignerCert(
  signerInfo: SignerInfo,
  chain: Certificate[],
): { cert: Certificate; derBytes: Uint8Array } | null {
  const sid = signerInfo.sid;

  if (sid.issuerAndSerialNumber) {
    const wantIssuerDer = new Uint8Array(
      AsnSerializer.serialize(sid.issuerAndSerialNumber.issuer),
    );
    const wantSerial = bufferSourceToBytes(sid.issuerAndSerialNumber.serialNumber);
    for (const c of chain) {
      const issuerDer = new Uint8Array(
        AsnSerializer.serialize(c.tbsCertificate.issuer),
      );
      const serial = bufferSourceToBytes(c.tbsCertificate.serialNumber);
      if (bytesEqual(issuerDer, wantIssuerDer) && bytesEqual(serial, wantSerial)) {
        return { cert: c, derBytes: new Uint8Array(AsnSerializer.serialize(c)) };
      }
    }
    return null;
  }

  if (sid.subjectKeyIdentifier) {
    const wantSkid = bufferSourceToBytes(sid.subjectKeyIdentifier);
    for (const c of chain) {
      const certSkid = getSkidBytes(c);
      if (certSkid && bytesEqual(certSkid, wantSkid)) {
        return { cert: c, derBytes: new Uint8Array(AsnSerializer.serialize(c)) };
      }
    }
    return null;
  }

  return null;
}

export type ChainWalkResult = {
  chain: Array<{ cert: Certificate; derBytes: Uint8Array; fingerprintHex: string }>;
  rootTrustedFilename: string | null;
  trustReason: "hash-pin" | "no-anchor-in-bundle";
  failures: string[];
};

export async function walkChainToTrustedRoot(
  leaf: { cert: Certificate; derBytes: Uint8Array },
  intermediates: Array<{ cert: Certificate; derBytes: Uint8Array }>,
  bundledRoots: Array<{ cert: Certificate; derBytes: Uint8Array }>,
): Promise<ChainWalkResult> {
  const failures: string[] = [];
  const walked: Array<{
    cert: Certificate;
    derBytes: Uint8Array;
    fingerprintHex: string;
  }> = [];

  const leafFp = await fingerprintCertDer(leaf.derBytes);
  walked.push({ ...leaf, fingerprintHex: leafFp });

  const MAX_DEPTH = 16;
  let current = leaf.cert;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const currentAkid = getAkidBytes(current);
    if (!currentAkid) {
      const currentDer = walked[walked.length - 1].derBytes;
      const trustCheck = isTrustedRootExactBytes(currentDer);
      if (trustCheck.trusted) {
        return {
          chain: walked,
          rootTrustedFilename: trustCheck.matchedFilename ?? null,
          trustReason: "hash-pin",
          failures,
        };
      }
      failures.push(
        `chain terminates at cert with no AKID and no matching bundled root at depth ${depth}`,
      );
      return {
        chain: walked,
        rootTrustedFilename: null,
        trustReason: "no-anchor-in-bundle",
        failures,
      };
    }

    let nextCandidate:
      | { cert: Certificate; derBytes: Uint8Array; source: "intermediate" | "root" }
      | null = null;

    for (const inter of intermediates) {
      const skid = getSkidBytes(inter.cert);
      if (skid && bytesEqual(skid, currentAkid)) {
        nextCandidate = { ...inter, source: "intermediate" };
        break;
      }
    }
    if (!nextCandidate) {
      for (const root of bundledRoots) {
        const skid = getSkidBytes(root.cert);
        if (skid && bytesEqual(skid, currentAkid)) {
          nextCandidate = { ...root, source: "root" };
          break;
        }
      }
    }
    if (!nextCandidate) {
      // Also try exact-byte match against bundled roots whose fingerprint is known
      // (some roots omit SKID).
      const currentDer = walked[walked.length - 1].derBytes;
      const trustCheck = isTrustedRootExactBytes(currentDer);
      if (trustCheck.trusted) {
        return {
          chain: walked,
          rootTrustedFilename: trustCheck.matchedFilename ?? null,
          trustReason: "hash-pin",
          failures,
        };
      }
      failures.push(
        `no cert with SKID matching current cert's AKID found at depth ${depth}`,
      );
      return {
        chain: walked,
        rootTrustedFilename: null,
        trustReason: "no-anchor-in-bundle",
        failures,
      };
    }

    const nextFp = await fingerprintCertDer(nextCandidate.derBytes);
    walked.push({
      cert: nextCandidate.cert,
      derBytes: nextCandidate.derBytes,
      fingerprintHex: nextFp,
    });

    if (nextCandidate.source === "root") {
      const trustCheck = isTrustedRootExactBytes(nextCandidate.derBytes);
      return {
        chain: walked,
        rootTrustedFilename: trustCheck.matchedFilename ?? null,
        trustReason: "hash-pin",
        failures,
      };
    }

    // Intermediate may itself be a bundled root (exact DER).
    {
      const trustCheck = isTrustedRootExactBytes(nextCandidate.derBytes);
      if (trustCheck.trusted) {
        return {
          chain: walked,
          rootTrustedFilename: trustCheck.matchedFilename ?? null,
          trustReason: "hash-pin",
          failures,
        };
      }
    }

    current = nextCandidate.cert;
  }

  failures.push(
    `chain walk exceeded MAX_DEPTH=${MAX_DEPTH} without reaching a trusted root`,
  );
  return {
    chain: walked,
    rootTrustedFilename: null,
    trustReason: "no-anchor-in-bundle",
    failures,
  };
}

/** RFC 3161 §2.3 EKU critical + id-kp-timeStamping. */
export function checkTsaLeafEku(leaf: Certificate): { ok: boolean; reason?: string } {
  const ext = getExt(leaf, OID.extendedKeyUsage);
  if (!ext) return { ok: false, reason: "leaf cert missing extendedKeyUsage extension" };
  if (!ext.critical) {
    return {
      ok: false,
      reason:
        "leaf cert EKU extension is not marked critical (RFC 3161 §2.3 violation)",
    };
  }
  try {
    const eku = AsnParser.parse(ext.extnValue.buffer, ExtendedKeyUsageExt);
    const oids = Array.from(eku);
    if (!oids.includes(OID.idKpTimeStamping)) {
      return {
        ok: false,
        reason: `leaf cert EKU does not include id-kp-timeStamping (got ${oids.join(",")})`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: `leaf cert EKU parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export type ValidityAsOfResult = {
  overallOk: boolean;
  perCert: Array<{
    fingerprintHex: string;
    notBefore: string;
    notAfter: string;
    validAtGenTime: boolean;
    reason?: string;
  }>;
};

/** Convert @peculiar Time (utcTime|generalTime Choice) to a Date. */
function timeToDate(t: { getTime: () => Date | number; utcTime?: Date; generalTime?: Date }): Date {
  if (t.utcTime instanceof Date) return t.utcTime;
  if (t.generalTime instanceof Date) return t.generalTime;
  const v = t.getTime();
  if (v instanceof Date) return v;
  return new Date(v);
}

/** Check cert validity windows as-of TSTInfo.genTime — never Date.now(). */
export async function checkChainValidityAsOfGenTime(
  chain: Array<{ cert: Certificate; derBytes: Uint8Array; fingerprintHex: string }>,
  genTime: Date,
): Promise<ValidityAsOfResult> {
  const gt = genTime.getTime();
  const perCert: ValidityAsOfResult["perCert"] = [];
  let overallOk = true;

  for (const entry of chain) {
    const nb = timeToDate(entry.cert.tbsCertificate.validity.notBefore);
    const na = timeToDate(entry.cert.tbsCertificate.validity.notAfter);
    const nbMs = nb.getTime();
    const naMs = na.getTime();
    let validAtGenTime = true;
    let reason: string | undefined;

    if (gt < nbMs) {
      validAtGenTime = false;
      reason = `notBefore=${nb.toISOString()} > genTime=${genTime.toISOString()}`;
    } else if (gt > naMs) {
      validAtGenTime = false;
      reason = `notAfter=${na.toISOString()} < genTime=${genTime.toISOString()}`;
    }

    if (!validAtGenTime) overallOk = false;

    perCert.push({
      fingerprintHex: entry.fingerprintHex,
      notBefore: nb.toISOString(),
      notAfter: na.toISOString(),
      validAtGenTime,
      reason,
    });
  }

  return { overallOk, perCert };
}
