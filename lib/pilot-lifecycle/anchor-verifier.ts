/**
 * Phase MEM_LIFECYCLE Block 9 + 9.1 — HONEST browser-side anchor verifier.
 *
 * v1 (Block 9): Merkle-inclusion recomputation + TSR presence/parseability.
 * v2 (Block 9.1): full CMS SignedData signature verification against bundled
 *   TSA roots, with as-of-genTime chain validity.
 */

import { AsnParser, AsnSerializer } from "@peculiar/asn1-schema";
import { TimeStampResp, TSTInfo } from "@peculiar/asn1-tsp";
import { SignedData } from "@peculiar/asn1-cms";
import { Certificate } from "@peculiar/asn1-x509";
import {
  merkleInclusionProof,
  verifyMerkleProof,
  type MerkleProofStep,
} from "./merkle";
import {
  findSignerCert,
  splitCertChainDer,
  walkChainToTrustedRoot,
  checkTsaLeafEku,
  checkChainValidityAsOfGenTime,
  type ChainWalkResult,
} from "./cert-chain";
import {
  reencodeSignedAttrsAsSet,
  verifySignedAttrs,
  verifySignerInfoSignature,
} from "./cms-verify";
import { TRUSTED_ROOTS, fingerprintCertDer } from "./tsa-trust";

async function subtleSha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const buf = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(buf);
}

export type AnchorBatch = {
  id: number;
  merkle_root: Uint8Array;
  leaf_count: number;
  batch_start_chain_seq: number;
  batch_end_chain_seq: number;
};

export type AnchorLeaf = {
  leaf_index: number;
  chain_seq: number;
  event_id: string;
  row_hash_bytes: Uint8Array;
};

export type AnchorTsr = {
  tsa_name: "digicert" | "sectigo" | "identrust";
  tsa_url: string;
  tsr_der: Uint8Array;
  gen_time: string;
  tsa_cert_chain?: Uint8Array | null;
};

export type TsrReport = {
  tsa_name: string;
  tsa_url: string;
  genTime: string;
  messageImprintMatches: boolean;
  cmsSignatureOk: boolean;
  chainOk: boolean;
  trustPinMatched: boolean;
  trustPinFilename: string | null;
  signerCertFingerprintHex: string | null;
  ekuOk: boolean;
  validityAsOfGenTime: {
    overallOk: boolean;
    perCert: Array<{
      fingerprintHex: string;
      notBefore: string;
      notAfter: string;
      validAtGenTime: boolean;
      reason?: string;
    }>;
  };
  algorithm: string | null;
  cmsNotes: string[];
};

export type VerifyReport = {
  chain_seq: number;
  event_id: string;
  batch_id: number;
  merkle_ok: boolean;
  merkle_expected_root_hex: string;
  merkle_actual_root_hex: string;
  tsrs: TsrReport[];
  overallOk: boolean;
  notes: string[];
  version: "9.1";
};

export async function verifyEventAnchored(params: {
  targetChainSeq: number;
  batch: AnchorBatch;
  leaves: readonly AnchorLeaf[];
  tsrs: readonly AnchorTsr[];
}): Promise<VerifyReport> {
  const { targetChainSeq, batch, leaves, tsrs } = params;
  const notes: string[] = [];

  const target = leaves.find((l) => l.chain_seq === targetChainSeq);
  if (!target) {
    return {
      chain_seq: targetChainSeq,
      event_id: "",
      batch_id: batch.id,
      merkle_ok: false,
      merkle_expected_root_hex: bytesToHex(batch.merkle_root),
      merkle_actual_root_hex: "",
      tsrs: [],
      overallOk: false,
      notes: ["target chain_seq not found in batch leaves"],
      version: "9.1",
    };
  }

  const sorted = leaves.slice().sort((a, b) => a.leaf_index - b.leaf_index);
  if (sorted.length !== batch.leaf_count) {
    notes.push(
      `leaf count mismatch: got ${sorted.length}, expected ${batch.leaf_count}`,
    );
  }
  const leafBytes = sorted.map((l) => l.row_hash_bytes);

  const proof: MerkleProofStep[] = await merkleInclusionProof(
    leafBytes,
    target.leaf_index,
    subtleSha256,
  );
  const merkle_ok = await verifyMerkleProof(
    target.row_hash_bytes,
    proof,
    batch.merkle_root,
    subtleSha256,
  );
  const actualRoot = await recomputeRoot(leafBytes, subtleSha256);

  const bundledRootCerts = TRUSTED_ROOTS.map((r) => {
    const copy = new Uint8Array(r.der.byteLength);
    copy.set(r.der);
    const cert = AsnParser.parse(copy, Certificate);
    return { cert, derBytes: r.der };
  });

  const tsrReports: TsrReport[] = [];

  for (const t of tsrs) {
    const report: TsrReport = {
      tsa_name: t.tsa_name,
      tsa_url: t.tsa_url,
      genTime: t.gen_time,
      messageImprintMatches: false,
      cmsSignatureOk: false,
      chainOk: false,
      trustPinMatched: false,
      trustPinFilename: null,
      signerCertFingerprintHex: null,
      ekuOk: false,
      validityAsOfGenTime: { overallOk: false, perCert: [] },
      algorithm: null,
      cmsNotes: [],
    };

    try {
      const tsrCopy = new Uint8Array(t.tsr_der.byteLength);
      tsrCopy.set(t.tsr_der);
      const tsr = AsnParser.parse(tsrCopy, TimeStampResp);
      if (!tsr.timeStampToken) throw new Error("no timeStampToken");
      const signedData = AsnParser.parse(tsr.timeStampToken.content, SignedData);
      const encap = signedData.encapContentInfo.eContent;
      if (!encap) throw new Error("no eContent");
      const tstDer = encap.single
        ? new Uint8Array(encap.single.buffer)
        : encap.any
          ? new Uint8Array(encap.any)
          : null;
      if (!tstDer) throw new Error("empty eContent");
      const tstInfo = AsnParser.parse(tstDer, TSTInfo);
      const imprint = new Uint8Array(tstInfo.messageImprint.hashedMessage.buffer);
      report.messageImprintMatches = bytesEqual(imprint, batch.merkle_root);
      report.genTime = tstInfo.genTime.toISOString();

      if (signedData.signerInfos.length === 0) {
        throw new Error("SignedData has no signerInfos");
      }
      const signerInfo = signedData.signerInfos[0];
      if (signedData.signerInfos.length > 1) {
        report.cmsNotes.push(
          `SignedData has ${signedData.signerInfos.length} signerInfos; verifying only the first (RFC 3161 typical)`,
        );
      }

      let chainCerts: Array<{ cert: Certificate; derBytes: Uint8Array }> = [];
      if (t.tsa_cert_chain && t.tsa_cert_chain.length > 0) {
        chainCerts = splitCertChainDer(t.tsa_cert_chain).map((c) => ({
          cert: c,
          derBytes: new Uint8Array(AsnSerializer.serialize(c)),
        }));
      } else if (signedData.certificates) {
        for (const choice of signedData.certificates) {
          if (choice.certificate) {
            chainCerts.push({
              cert: choice.certificate,
              derBytes: new Uint8Array(
                AsnSerializer.serialize(choice.certificate),
              ),
            });
          }
        }
      }
      if (chainCerts.length === 0) {
        throw new Error("no TSA certificates available for chain verification");
      }

      const signer = findSignerCert(
        signerInfo,
        chainCerts.map((c) => c.cert),
      );
      if (!signer) {
        throw new Error("SignerInfo.sid does not match any cert in the chain");
      }
      report.signerCertFingerprintHex = await fingerprintCertDer(signer.derBytes);

      const ekuCheck = checkTsaLeafEku(signer.cert);
      report.ekuOk = ekuCheck.ok;
      if (!ekuCheck.ok) report.cmsNotes.push(`EKU: ${ekuCheck.reason}`);

      const signerFp = report.signerCertFingerprintHex;
      const intermediates = [];
      for (const c of chainCerts) {
        const fp = await fingerprintCertDer(c.derBytes);
        if (fp !== signerFp) intermediates.push(c);
      }
      const walk: ChainWalkResult = await walkChainToTrustedRoot(
        signer,
        intermediates,
        bundledRootCerts,
      );
      report.chainOk =
        walk.trustReason === "hash-pin" && walk.rootTrustedFilename !== null;
      report.trustPinMatched = report.chainOk;
      report.trustPinFilename = walk.rootTrustedFilename;
      for (const f of walk.failures) report.cmsNotes.push(`chain: ${f}`);

      const validity = await checkChainValidityAsOfGenTime(
        walk.chain,
        tstInfo.genTime,
      );
      report.validityAsOfGenTime = validity;
      for (const pc of validity.perCert) {
        if (!pc.validAtGenTime && pc.reason) {
          report.cmsNotes.push(
            `validity: cert ${pc.fingerprintHex.slice(0, 16)}… ${pc.reason}`,
          );
        }
      }

      const digestHash =
        signerInfo.digestAlgorithm.algorithm === "2.16.840.1.101.3.4.2.2"
          ? "SHA-384"
          : signerInfo.digestAlgorithm.algorithm === "2.16.840.1.101.3.4.2.3"
            ? "SHA-512"
            : "SHA-256";
      const attrsCheck = await verifySignedAttrs(
        signerInfo,
        tstDer,
        signedData.encapContentInfo.eContentType,
        digestHash,
      );
      for (const r of attrsCheck.reasons) report.cmsNotes.push(`signedAttrs: ${r}`);

      const spki = new Uint8Array(
        AsnSerializer.serialize(signer.cert.tbsCertificate.subjectPublicKeyInfo),
      );
      const reencoded = reencodeSignedAttrsAsSet(signerInfo);
      const sigResult = await verifySignerInfoSignature(
        signerInfo,
        spki,
        reencoded,
      );
      report.cmsSignatureOk = sigResult.ok && attrsCheck.ok;
      report.algorithm = sigResult.algo
        ? `${sigResult.algo.kind}${"hash" in sigResult.algo ? "-" + sigResult.algo.hash : ""}`
        : null;
      if (sigResult.reason) report.cmsNotes.push(`signature: ${sigResult.reason}`);
      if (
        sigResult.algo &&
        (sigResult.algo.kind === "rsa-pss" || sigResult.algo.kind === "ecdsa")
      ) {
        report.cmsNotes.push(
          `algorithm ${sigResult.algo.kind}: NOTE — no live TSA uses this algorithm as of Block 9.1 (2026-08-05). Verified against synthetic vectors only.`,
        );
      }
    } catch (err) {
      report.cmsNotes.push(
        `TSR verification error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    tsrReports.push(report);
  }

  const anyTsrFullyValid = tsrReports.some(
    (r) =>
      r.messageImprintMatches &&
      r.cmsSignatureOk &&
      r.chainOk &&
      r.ekuOk &&
      r.validityAsOfGenTime.overallOk,
  );

  const overallOk = merkle_ok && anyTsrFullyValid;

  if (overallOk) {
    notes.push(
      "Block 9.1 full CMS verification active — signature, cert chain, EKU, and as-of-genTime validity all confirmed in-browser against bundled TSA roots.",
    );
  } else if (merkle_ok) {
    notes.push(
      "Block 9.1: Merkle-inclusion proof passed but no TSR passed full CMS verification. See tsrs[].cmsNotes for specific failures.",
    );
  }

  return {
    chain_seq: target.chain_seq,
    event_id: target.event_id,
    batch_id: batch.id,
    merkle_ok,
    merkle_expected_root_hex: bytesToHex(batch.merkle_root),
    merkle_actual_root_hex: bytesToHex(actualRoot),
    tsrs: tsrReports,
    overallOk,
    notes,
    version: "9.1",
  };
}

async function recomputeRoot(
  leaves: readonly Uint8Array[],
  sha256: (d: Uint8Array) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  let level = leaves.slice();
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        const buf = new Uint8Array(64);
        buf.set(level[i], 0);
        buf.set(level[i + 1], 32);
        next.push(await sha256(buf));
      } else {
        next.push(level[i]);
      }
    }
    level = next;
  }
  return level[0];
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += x.toString(16).padStart(2, "0");
  return s;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
