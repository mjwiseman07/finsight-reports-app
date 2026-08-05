/**
 * Phase MEM_LIFECYCLE Block 9 — RFC 3161 TSA client (server-side).
 *
 * Builds a TimeStampReq (SHA-256 messageImprint over the Merkle root, random
 * nonce, certReq=true), POSTs it to a TSA with the standard content types,
 * parses the TimeStampResp / TSTInfo out of the returned CMS SignedData.
 *
 * IMPORTANT: This module runs ONLY on the server (Node runtime). The browser
 * verifier reuses the same ASN.1 packages but does NOT call TSAs directly.
 *
 * Peculiar adaptations vs paste sketch:
 *   - TimeStampReq.nonce / TSTInfo.serialNumber / TSTInfo.nonce are ArrayBuffer
 *   - MessageImprint.hashedMessage is OctetString
 *   - ContentInfo.content is already ArrayBuffer → parse SignedData directly
 *   - EncapsulatedContent.eContent.single holds the TSTInfo OCTET STRING
 */

import { randomBytes, createHash } from "node:crypto";
import { AsnParser, AsnSerializer, OctetString } from "@peculiar/asn1-schema";
import {
  TimeStampReq,
  TimeStampResp,
  TSTInfo,
  MessageImprint,
} from "@peculiar/asn1-tsp";
import { ContentInfo, SignedData } from "@peculiar/asn1-cms";
import { AlgorithmIdentifier } from "@peculiar/asn1-x509";

/** OID for id-sha256 = 2.16.840.1.101.3.4.2.1 */
const SHA256_OID = "2.16.840.1.101.3.4.2.1";

export type TsaEndpoint = {
  name: "digicert" | "sectigo" | "identrust";
  url: string;
};

export const TSA_ENDPOINTS: readonly TsaEndpoint[] = [
  { name: "digicert", url: "http://timestamp.digicert.com" },
  { name: "sectigo", url: "http://timestamp.sectigo.com" },
] as const;

export type TsaResponse = {
  tsa: TsaEndpoint;
  tsrDer: Uint8Array;
  genTime: Date;
  serialNumber: string; // decimal string — TSA serials can exceed Number
  nonce: Uint8Array | null;
  messageImprint: Uint8Array; // 32 bytes, must equal the merkle root we sent
  certChainDer: Uint8Array | null; // concatenated DER certs, if TSA embedded them
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function abToBytes(ab: ArrayBuffer): Uint8Array {
  return new Uint8Array(ab.slice(0));
}

function abToDecimalString(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let n = BigInt(0);
  for (const b of bytes) n = (n << BigInt(8)) | BigInt(b);
  return n.toString();
}

/**
 * Build a DER-encoded TimeStampReq for the given 32-byte sha256 digest.
 * Requests certReq=true so the TSA embeds its cert chain.
 */
export function buildTsq(sha256Digest: Uint8Array, nonce: Uint8Array): Uint8Array {
  if (sha256Digest.length !== 32) {
    throw new Error(`buildTsq: expected 32-byte digest, got ${sha256Digest.length}`);
  }
  const req = new TimeStampReq({
    version: 1,
    messageImprint: new MessageImprint({
      hashAlgorithm: new AlgorithmIdentifier({ algorithm: SHA256_OID }),
      hashedMessage: new OctetString(sha256Digest),
    }),
    nonce: toArrayBuffer(nonce),
    certReq: true,
  });
  return new Uint8Array(AsnSerializer.serialize(req));
}

/** POST the TSQ to a single TSA. Returns raw DER TSR bytes. */
export async function postTsq(
  endpoint: TsaEndpoint,
  tsqDer: Uint8Array,
  opts?: { timeoutMs?: number },
): Promise<Uint8Array> {
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/timestamp-query",
        Accept: "application/timestamp-reply",
      },
      body: Buffer.from(tsqDer),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`TSA ${endpoint.name} returned HTTP ${res.status}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0) {
      throw new Error(`TSA ${endpoint.name} returned empty body`);
    }
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a raw TSR into the fields we persist. Verifies:
 *  - status.status = 0 (granted) or 1 (grantedWithMods)
 *  - messageImprint.hashedMessage matches the digest we submitted
 * Signature verification against the TSA cert chain is the BROWSER'S job —
 * the server writes what the TSA returned, faithfully, without trust-washing.
 */
export function parseTsr(
  tsrDer: Uint8Array,
  expectedDigest: Uint8Array,
): {
  genTime: Date;
  serialNumber: string;
  nonce: Uint8Array | null;
  messageImprint: Uint8Array;
  certChainDer: Uint8Array | null;
} {
  const tsr = AsnParser.parse(tsrDer, TimeStampResp);
  const status = tsr.status.status; // 0=granted, 1=grantedWithMods, 2=rejection, ...
  if (status !== 0 && status !== 1) {
    throw new Error(`TSR status not granted: ${status}`);
  }
  if (!tsr.timeStampToken) {
    throw new Error("TSR missing timeStampToken");
  }
  const ci: ContentInfo = tsr.timeStampToken;
  if (!ci.content) throw new Error("TSR ContentInfo missing content");

  const signedData = AsnParser.parse(ci.content, SignedData);
  const encap = signedData.encapContentInfo.eContent;
  if (!encap) throw new Error("TSR SignedData missing eContent");

  const tstInfoDer = encap.single
    ? new Uint8Array(encap.single.buffer)
    : encap.any
      ? new Uint8Array(encap.any)
      : null;
  if (!tstInfoDer || tstInfoDer.length === 0) {
    throw new Error("TSR eContent empty");
  }
  const tstInfo = AsnParser.parse(tstInfoDer, TSTInfo);

  const hashedMessage = new Uint8Array(tstInfo.messageImprint.hashedMessage.buffer);
  if (hashedMessage.length !== expectedDigest.length) {
    throw new Error("TSR messageImprint length mismatch");
  }
  for (let i = 0; i < hashedMessage.length; i++) {
    if (hashedMessage[i] !== expectedDigest[i]) {
      throw new Error("TSR messageImprint content mismatch — TSA signed the wrong hash");
    }
  }

  const genTime = tstInfo.genTime;
  if (!(genTime instanceof Date)) {
    throw new Error("TSR genTime not a Date after parse");
  }

  const serialNumber = abToDecimalString(tstInfo.serialNumber);
  const nonce = tstInfo.nonce !== undefined ? abToBytes(tstInfo.nonce) : null;

  let certChainDer: Uint8Array | null = null;
  if (signedData.certificates && signedData.certificates.length > 0) {
    const parts: Uint8Array[] = [];
    for (const choice of signedData.certificates) {
      if (choice.certificate) {
        parts.push(new Uint8Array(AsnSerializer.serialize(choice.certificate)));
      }
    }
    if (parts.length > 0) {
      const total = parts.reduce((a, p) => a + p.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const p of parts) {
        out.set(p, off);
        off += p.length;
      }
      certChainDer = out;
    }
  }

  return {
    genTime,
    serialNumber,
    nonce,
    messageImprint: hashedMessage,
    certChainDer,
  };
}

/**
 * Fire-and-collect: submit the same digest to all endpoints in parallel.
 * Each promise is settled independently — a single TSA failure does NOT
 * abort the others. Caller decides success threshold (Block 9 rule: >= 1
 * warning, 0 fatal, 2 clean).
 */
export async function anchorToAllTsas(
  merkleRoot: Uint8Array,
  endpoints: readonly TsaEndpoint[] = TSA_ENDPOINTS,
): Promise<
  Array<
    | { ok: true; tsa: TsaEndpoint; result: TsaResponse }
    | { ok: false; tsa: TsaEndpoint; error: string }
  >
> {
  const nonce = randomBytes(16); // 128 bits — RFC 3161 allows any positive integer
  const tsq = buildTsq(merkleRoot, nonce);
  const settled = await Promise.allSettled(
    endpoints.map(async (ep) => {
      const tsrDer = await postTsq(ep, tsq);
      const parsed = parseTsr(tsrDer, merkleRoot);
      const result: TsaResponse = {
        tsa: ep,
        tsrDer,
        ...parsed,
      };
      return result;
    }),
  );
  return settled.map((s, i) => {
    const ep = endpoints[i];
    if (s.status === "fulfilled") {
      return { ok: true as const, tsa: ep, result: s.value };
    }
    return {
      ok: false as const,
      tsa: ep,
      error: s.reason instanceof Error ? s.reason.message : String(s.reason),
    };
  });
}

export function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}
