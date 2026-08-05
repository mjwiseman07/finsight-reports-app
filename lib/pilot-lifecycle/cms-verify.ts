/**
 * Phase MEM_LIFECYCLE Block 9.1 — browser-side CMS SignedData verification.
 *
 * Verifies SignerInfo signature over signedAttrs per RFC 5652 §5.4-5.6,
 * including the critical signedAttrs [0] IMPLICIT → SET EXPLICIT re-encoding.
 *
 * RSA-PKCS1v15 SHA-256/384/512: REAL (DigiCert + Sectigo live).
 * RSA-PSS / ECDSA: STRUCTURAL (synthetic only as of 2026-08-05).
 */

import { AsnParser, AsnSerializer } from "@peculiar/asn1-schema";
import { SignerInfo } from "@peculiar/asn1-cms";
import type { AlgorithmIdentifier } from "@peculiar/asn1-x509";
import { RsaPssParams, EcdsaSigValue, OID } from "./asn1-extensions";

/** RFC 5652 §5.4: re-encode signedAttrs as SET (0x31), not context [0] (0xA0). */
export function reencodeSignedAttrsAsSet(signerInfo: SignerInfo): Uint8Array {
  if (!signerInfo.signedAttrs) {
    throw new Error("SignerInfo has no signedAttrs — Block 9 TSAs always populate this");
  }
  const attrs = Array.from(signerInfo.signedAttrs);
  // RFC 5652 / X.690: DER-encoded SET OF must have elements sorted by tag+value
  // (lexicographic BER encoding order). Reconstructing without sort breaks verify.
  const attrDers = attrs
    .map((a) => new Uint8Array(AsnSerializer.serialize(a)))
    .sort((a, b) => {
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
      }
      return a.length - b.length;
    });
  const totalContent = attrDers.reduce((n, b) => n + b.length, 0);

  let lenBytes: number[];
  if (totalContent < 0x80) {
    lenBytes = [totalContent];
  } else if (totalContent < 0x100) {
    lenBytes = [0x81, totalContent];
  } else if (totalContent < 0x10000) {
    lenBytes = [0x82, (totalContent >> 8) & 0xff, totalContent & 0xff];
  } else if (totalContent < 0x1000000) {
    lenBytes = [
      0x83,
      (totalContent >> 16) & 0xff,
      (totalContent >> 8) & 0xff,
      totalContent & 0xff,
    ];
  } else {
    lenBytes = [
      0x84,
      (totalContent >>> 24) & 0xff,
      (totalContent >> 16) & 0xff,
      (totalContent >> 8) & 0xff,
      totalContent & 0xff,
    ];
  }

  const out = new Uint8Array(1 + lenBytes.length + totalContent);
  out[0] = 0x31;
  out.set(lenBytes, 1);
  let off = 1 + lenBytes.length;
  for (const der of attrDers) {
    out.set(der, off);
    off += der.length;
  }
  return out;
}

export type SignedAttrsCheck = {
  ok: boolean;
  contentTypeMatches: boolean;
  messageDigestMatches: boolean;
  reasons: string[];
};

export async function verifySignedAttrs(
  signerInfo: SignerInfo,
  eContent: Uint8Array,
  eContentType: string,
  digestHashName: "SHA-256" | "SHA-384" | "SHA-512",
): Promise<SignedAttrsCheck> {
  const reasons: string[] = [];
  if (!signerInfo.signedAttrs) {
    return {
      ok: false,
      contentTypeMatches: false,
      messageDigestMatches: false,
      reasons: ["signerInfo has no signedAttrs"],
    };
  }
  const attrs = Array.from(signerInfo.signedAttrs);

  const ctAttr = attrs.find((a) => a.attrType === OID.contentType);
  let contentTypeMatches = false;
  if (!ctAttr) reasons.push("signedAttrs missing content-type attribute");
  else {
    const values = Array.from(ctAttr.attrValues);
    if (values.length !== 1) {
      reasons.push(`content-type attribute has ${values.length} values, expected 1`);
    } else {
      try {
        const oidBytes = new Uint8Array(values[0]);
        // asn1-schema may give either bare OID content or full TLV.
        const expectedContent = encodeOid(eContentType);
        const expectedTlv = encodeOidTlv(eContentType);
        contentTypeMatches =
          arraysEqual(oidBytes, expectedContent) || arraysEqual(oidBytes, expectedTlv);
        if (!contentTypeMatches) {
          reasons.push(
            `content-type attribute value does not match eContentType ${eContentType}`,
          );
        }
      } catch (err) {
        reasons.push(
          `failed to parse content-type attribute value: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  const mdAttr = attrs.find((a) => a.attrType === OID.messageDigest);
  let messageDigestMatches = false;
  if (!mdAttr) reasons.push("signedAttrs missing messageDigest attribute");
  else {
    const values = Array.from(mdAttr.attrValues);
    if (values.length !== 1) {
      reasons.push(`messageDigest attribute has ${values.length} values, expected 1`);
    } else {
      const raw = new Uint8Array(values[0]);
      const md = raw[0] === 0x04 ? extractOctetStringContent(raw) : raw;
      const eCopy = new Uint8Array(eContent.byteLength);
      eCopy.set(eContent);
      const computed = new Uint8Array(await crypto.subtle.digest(digestHashName, eCopy));
      messageDigestMatches = arraysEqual(md, computed);
      if (!messageDigestMatches) {
        reasons.push(
          `messageDigest (${bytesToHex(md)}) does not match ${digestHashName}(eContent) (${bytesToHex(computed)})`,
        );
      }
    }
  }

  return {
    ok: contentTypeMatches && messageDigestMatches,
    contentTypeMatches,
    messageDigestMatches,
    reasons,
  };
}

export type SigAlgo =
  | { kind: "rsa-pkcs1v15"; hash: "SHA-256" | "SHA-384" | "SHA-512" }
  | { kind: "rsa-pss"; hash: "SHA-256" | "SHA-384"; saltLength: number }
  | { kind: "ecdsa"; namedCurve: "P-256" | "P-384"; hash: "SHA-256" | "SHA-384" };

export function detectSigAlgo(
  signatureAlg: AlgorithmIdentifier,
  digestAlg: AlgorithmIdentifier,
): SigAlgo | { error: string } {
  const sigOid = signatureAlg.algorithm;
  const digOid = digestAlg.algorithm;

  const digestHash = digestOidToHash(digOid);
  if (!digestHash) return { error: `unsupported digestAlgorithm OID: ${digOid}` };

  if (sigOid === OID.rsaEncryption) {
    if (digestHash === "SHA-1") return { error: "SHA-1 signatures not supported" };
    return { kind: "rsa-pkcs1v15", hash: digestHash };
  }

  if (sigOid === OID.sha256WithRSAEncryption) return { kind: "rsa-pkcs1v15", hash: "SHA-256" };
  if (sigOid === OID.sha384WithRSAEncryption) return { kind: "rsa-pkcs1v15", hash: "SHA-384" };
  if (sigOid === OID.sha512WithRSAEncryption) return { kind: "rsa-pkcs1v15", hash: "SHA-512" };

  if (sigOid === OID.idRsassaPss) {
    if (!signatureAlg.parameters) {
      return { error: "RSA-PSS with default SHA-1 parameters not supported" };
    }
    try {
      const params = AsnParser.parse(signatureAlg.parameters, RsaPssParams);
      const hashOid = params.hashAlgorithm?.algorithm ?? OID.sha1;
      if (hashOid === OID.sha256) {
        return { kind: "rsa-pss", hash: "SHA-256", saltLength: params.saltLength };
      }
      if (hashOid === OID.sha384) {
        return { kind: "rsa-pss", hash: "SHA-384", saltLength: params.saltLength };
      }
      return { error: `RSA-PSS with unsupported hash OID ${hashOid}` };
    } catch (err) {
      return {
        error: `RSA-PSS parameters parse failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  if (sigOid === OID.ecdsaWithSha256) {
    return { kind: "ecdsa", namedCurve: "P-256", hash: "SHA-256" };
  }
  if (sigOid === OID.ecdsaWithSha384) {
    return { kind: "ecdsa", namedCurve: "P-384", hash: "SHA-384" };
  }

  return { error: `unsupported signatureAlgorithm OID: ${sigOid}` };
}

function digestOidToHash(
  oid: string,
): "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512" | null {
  if (oid === OID.sha1) return "SHA-1";
  if (oid === OID.sha256) return "SHA-256";
  if (oid === OID.sha384) return "SHA-384";
  if (oid === OID.sha512) return "SHA-512";
  return null;
}

async function importVerifyKey(
  spkiDer: Uint8Array,
  algo: SigAlgo,
): Promise<CryptoKey> {
  const copy = new Uint8Array(spkiDer.byteLength);
  copy.set(spkiDer);
  if (algo.kind === "ecdsa") {
    return crypto.subtle.importKey(
      "spki",
      copy,
      { name: "ECDSA", namedCurve: algo.namedCurve },
      false,
      ["verify"],
    );
  }
  if (algo.kind === "rsa-pss") {
    return crypto.subtle.importKey(
      "spki",
      copy,
      { name: "RSA-PSS", hash: algo.hash },
      false,
      ["verify"],
    );
  }
  return crypto.subtle.importKey(
    "spki",
    copy,
    { name: "RSASSA-PKCS1-v1_5", hash: algo.hash },
    false,
    ["verify"],
  );
}

function ecdsaDerToP1363(derSig: Uint8Array, curveByteLen: number): Uint8Array {
  const sig = AsnParser.parse(derSig, EcdsaSigValue);
  const r = bigintToFixedBytes(sig.r, curveByteLen);
  const s = bigintToFixedBytes(sig.s, curveByteLen);
  const out = new Uint8Array(curveByteLen * 2);
  out.set(r, 0);
  out.set(s, curveByteLen);
  return out;
}

function bigintToFixedBytes(n: bigint, len: number): Uint8Array {
  if (n < BigInt(0)) throw new Error("ECDSA sig component negative");
  const bytes: number[] = [];
  let v = n;
  while (v > BigInt(0)) {
    bytes.unshift(Number(v & BigInt(0xff)));
    v >>= BigInt(8);
  }
  if (bytes.length > len) {
    throw new Error(
      `ECDSA sig component (${bytes.length}) > curve field width (${len})`,
    );
  }
  const out = new Uint8Array(len);
  out.set(bytes, len - bytes.length);
  return out;
}

export async function verifySignerInfoSignature(
  signerInfo: SignerInfo,
  signerCertSpki: Uint8Array,
  reencodedSignedAttrsSet: Uint8Array,
): Promise<{ ok: boolean; algo?: SigAlgo; reason?: string }> {
  const algoOrError = detectSigAlgo(
    signerInfo.signatureAlgorithm,
    signerInfo.digestAlgorithm,
  );
  if ("error" in algoOrError) return { ok: false, reason: algoOrError.error };
  const algo = algoOrError;

  let key: CryptoKey;
  try {
    key = await importVerifyKey(signerCertSpki, algo);
  } catch (err) {
    return {
      ok: false,
      algo,
      reason: `importKey failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const sigBuf = bufferSourceToBytes(signerInfo.signature);
  if (sigBuf.length === 0) {
    return { ok: false, algo, reason: "empty signature value" };
  }
  let verifyAlgo: Algorithm | EcdsaParams | RsaPssParamsWeb =
    { name: "RSASSA-PKCS1-v1_5" };
  let sigToVerify: Uint8Array = sigBuf;

  if (algo.kind === "rsa-pss") {
    verifyAlgo = { name: "RSA-PSS", saltLength: algo.saltLength };
  } else if (algo.kind === "ecdsa") {
    verifyAlgo = { name: "ECDSA", hash: algo.hash };
    const curveLen = algo.namedCurve === "P-256" ? 32 : 48;
    try {
      sigToVerify = ecdsaDerToP1363(sigBuf, curveLen);
    } catch (err) {
      return {
        ok: false,
        algo,
        reason: `ECDSA DER→P1363 conversion failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  try {
    const dataCopy = new Uint8Array(reencodedSignedAttrsSet.byteLength);
    dataCopy.set(reencodedSignedAttrsSet);
    const sigCopy = new Uint8Array(sigToVerify.byteLength);
    sigCopy.set(sigToVerify);
    const ok = await crypto.subtle.verify(verifyAlgo, key, sigCopy, dataCopy);
    return { ok, algo };
  } catch (err) {
    return {
      ok: false,
      algo,
      reason: `subtle.verify threw: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

type RsaPssParamsWeb = { name: string; saltLength: number };

/** Extract raw bytes from ArrayBuffer / ArrayBufferView / @peculiar OctetString.
 *  IMPORTANT: `new Uint8Array(octetString)` uses the `.length` property (often 0
 *  on OctetString) rather than `.byteLength` — always prefer buffer+offset. */
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
  const duck = v as { buffer?: ArrayBuffer; byteOffset?: number; byteLength?: number };
  if (duck.buffer instanceof ArrayBuffer && typeof duck.byteLength === "number") {
    return new Uint8Array(
      duck.buffer,
      duck.byteOffset ?? 0,
      duck.byteLength,
    );
  }
  return new Uint8Array(0);
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += x.toString(16).padStart(2, "0");
  return s;
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function extractOctetStringContent(tlv: Uint8Array): Uint8Array {
  if (tlv[0] !== 0x04) {
    throw new Error(`expected OCTET STRING (0x04), got 0x${tlv[0].toString(16)}`);
  }
  let contentStart: number;
  let contentLength: number;
  const lb = tlv[1];
  if (lb < 0x80) {
    contentStart = 2;
    contentLength = lb;
  } else {
    const n = lb & 0x7f;
    if (n === 0 || n > 4) throw new Error("unsupported OCTET STRING length encoding");
    contentStart = 2 + n;
    let l = 0;
    for (let i = 0; i < n; i++) l = (l << 8) | tlv[2 + i];
    contentLength = l;
  }
  return tlv.slice(contentStart, contentStart + contentLength);
}

function encodeOid(oid: string): Uint8Array {
  const parts = oid.split(".").map((n) => Number(n));
  if (parts.length < 2) throw new Error("invalid OID");
  const out: number[] = [];
  out.push(parts[0] * 40 + parts[1]);
  for (let i = 2; i < parts.length; i++) {
    let n = parts[i];
    if (n === 0) {
      out.push(0);
      continue;
    }
    const bytes: number[] = [];
    while (n > 0) {
      bytes.unshift(n & 0x7f);
      n >>>= 7;
    }
    for (let j = 0; j < bytes.length - 1; j++) bytes[j] |= 0x80;
    out.push(...bytes);
  }
  return new Uint8Array(out);
}

function encodeOidTlv(oid: string): Uint8Array {
  const content = encodeOid(oid);
  const out = new Uint8Array(2 + content.length);
  out[0] = 0x06;
  out[1] = content.length;
  out.set(content, 2);
  return out;
}
