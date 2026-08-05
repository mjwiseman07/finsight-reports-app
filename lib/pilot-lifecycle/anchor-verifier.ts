/**
 * Phase MEM_LIFECYCLE Block 9 — HONEST browser-side anchor verifier.
 *
 * Honesty contract:
 *  - Runs entirely in the browser.
 *  - Uses Web Crypto subtle.digest for SHA-256.
 *  - Does not "trust the server" for Merkle math — recomputation uses raw
 *    row_hash leaf bytes the caller already obtained (Timeline / read API).
 *  - TSA root certificates are BUNDLED as static assets (see public/tsa-roots);
 *    no live fetch from Advisacor OR from the TSA at verify time (Block 9.1).
 *
 * Scope of this module: the Merkle side + TSR presence / parseability.
 * Full CMS SignedData signature verification (subtle.verify walk against
 * bundled TSA roots as of TSTInfo.genTime) ships in Block 9.1 — deferred
 * explicitly via VerifyReport.notes (never silently missing).
 */

import { AsnParser } from "@peculiar/asn1-schema";
import { TimeStampResp, TSTInfo } from "@peculiar/asn1-tsp";
import { SignedData } from "@peculiar/asn1-cms";
import {
  merkleInclusionProof,
  verifyMerkleProof,
  type MerkleProofStep,
} from "./merkle";

async function subtleSha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const buf = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(buf);
}

export type AnchorBatch = {
  id: number;
  merkle_root: Uint8Array; // 32 bytes
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
  gen_time: string; // ISO 8601 from DB (informational; prefer TSTInfo when parsed)
};

export type VerifyReport = {
  chain_seq: number;
  event_id: string;
  batch_id: number;
  merkle_ok: boolean;
  merkle_expected_root_hex: string;
  merkle_actual_root_hex: string;
  tsrs: Array<{
    tsa_name: string;
    tsa_url: string;
    genTime: string;
    messageImprintMatches: boolean;
    // NOTE: cmsSignatureOk is INTENTIONALLY absent in v1 — see module header.
    // Block 9.1 will add {cmsSignatureOk, chainOk, notBeforeGenTime, notAfterGenTime}.
  }>;
  overallOk: boolean;
  notes: string[];
};

/**
 * Verify that a given event (identified by chain_seq) is included under the
 * batch's Merkle root AND that at least one TSA response embeds a matching imprint.
 */
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

  const tsrReports: VerifyReport["tsrs"] = [];
  for (const t of tsrs) {
    try {
      const tsr = AsnParser.parse(t.tsr_der, TimeStampResp);
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
      const messageImprintMatches = bytesEqual(imprint, batch.merkle_root);
      tsrReports.push({
        tsa_name: t.tsa_name,
        tsa_url: t.tsa_url,
        genTime: tstInfo.genTime.toISOString(),
        messageImprintMatches,
      });
    } catch (err) {
      tsrReports.push({
        tsa_name: t.tsa_name,
        tsa_url: t.tsa_url,
        genTime: t.gen_time,
        messageImprintMatches: false,
      });
      notes.push(
        `TSR parse failed for ${t.tsa_name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const overallOk =
    merkle_ok &&
    tsrReports.length > 0 &&
    tsrReports.some((r) => r.messageImprintMatches);

  notes.push(
    "Block 9 v1 verifier: honest Merkle-inclusion + TSR presence. Block 9.1 adds full CMS SignedData signature verification against bundled TSA roots as of TSTInfo.genTime.",
  );

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
