/**
 * Phase MEM_LIFECYCLE Block 9 — Merkle batch anchor job.
 *
 * One cycle:
 *   1. Read the highest chain_seq already anchored (max batch_end_chain_seq).
 *   2. Fetch all pilot_lifecycle_events with chain_seq > that, ORDER BY chain_seq ASC.
 *   3. If none, return { anchored: 0 }.
 *   4. Build Merkle root (SHA-256 binary tree over row_hash_bytes).
 *   5. Anchor root to both TSAs in parallel via anchorToAllTsas().
 *   6. If 0 succeed → recordIssue(fatal), throw. Do NOT write partial state.
 *   7. Insert batch + leaves + tsrs via sp_write_anchor_batch RPC.
 *   8. If K < N: recordIssue(warning) noting which TSAs failed.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { recordIssue } from "./issue-recorder";
import { rowHashToBytes, merkleRoot } from "./merkle";
import {
  anchorToAllTsas,
  sha256,
  TSA_ENDPOINTS,
  type TsaEndpoint,
  type TsaResponse,
} from "./rfc3161-client";

export type AnchorResult = {
  anchored: number; // count of events in the batch (0 if no-op)
  batchId: number | null; // pilot_lifecycle_anchor_batches.id
  tsasOk: string[]; // names of TSAs that succeeded
  tsasFailed: Array<{ name: string; error: string }>;
  merkleRootHex: string | null;
};

const MAX_BATCH_SIZE = 5000; // safety cap; cadence + volume make this loose

export async function runAnchorBatch(opts?: {
  endpoints?: readonly TsaEndpoint[];
}): Promise<AnchorResult> {
  const admin = getSupabaseAdmin();
  const endpoints = opts?.endpoints ?? TSA_ENDPOINTS;

  // 1. Find last anchored chain_seq.
  const { data: lastBatch, error: lastErr } = await admin
    .from("pilot_lifecycle_anchor_batches")
    .select("batch_end_chain_seq")
    .order("batch_end_chain_seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw new Error(`anchor: read last batch failed: ${lastErr.message}`);
  const startExclusive: number = lastBatch?.batch_end_chain_seq ?? 0;

  // 2. Fetch un-anchored events.
  const { data: eventsRaw, error: evErr } = await admin
    .from("pilot_lifecycle_events")
    .select("id, chain_seq, row_hash")
    .gt("chain_seq", startExclusive)
    .order("chain_seq", { ascending: true })
    .limit(MAX_BATCH_SIZE);
  if (evErr) throw new Error(`anchor: read events failed: ${evErr.message}`);

  const events = (eventsRaw ?? []) as Array<{
    id: string;
    chain_seq: number;
    row_hash: string | null;
  }>;

  if (events.length === 0) {
    return {
      anchored: 0,
      batchId: null,
      tsasOk: [],
      tsasFailed: [],
      merkleRootHex: null,
    };
  }

  // 3. Build Merkle tree.
  const leafBytes: Uint8Array[] = events.map((e) => {
    if (!e.row_hash) throw new Error(`anchor: event ${e.id} missing row_hash`);
    return rowHashToBytes(e.row_hash);
  });
  const root = await merkleRoot(leafBytes, async (d) => sha256(d));

  // 4. Anchor to all TSAs in parallel.
  const outcomes = await anchorToAllTsas(root, endpoints);
  const successes: TsaResponse[] = [];
  const failures: Array<{ name: string; error: string }> = [];
  for (const o of outcomes) {
    if (o.ok) successes.push(o.result);
    else failures.push({ name: o.tsa.name, error: o.error });
  }

  // 5. Zero successes → hard fail, no batch row written.
  if (successes.length === 0) {
    await recordIssue({
      fingerprint: `pilot-lifecycle-anchor:all-tsas-failed:${startExclusive}`,
      level: "fatal",
      issueKind: "pilot.lifecycle.chain.anchor",
      companyId: null,
      firmId: null,
      tags: {
        start_exclusive: String(startExclusive),
        leaf_count: String(events.length),
      },
      extra: { failures },
      message: `Chain anchor cycle FAILED: 0/${endpoints.length} TSAs responded. Batch not written.`,
    });
    throw new Error(
      `anchor: all TSAs failed — ${failures.map((f) => `${f.name}:${f.error}`).join("; ")}`,
    );
  }

  // 6. Insert batch + leaves + tsrs via a transactional RPC.
  // Adaptation: p_merkle_root is text '\\x'||hex (not raw bytea) for PostgREST safety.
  const batchPayload = {
    p_batch_start_chain_seq: events[0].chain_seq,
    p_batch_end_chain_seq: events[events.length - 1].chain_seq,
    p_leaf_count: events.length,
    p_merkle_root: bytesToBytea(root),
    p_leaves: events.map((e, i) => ({
      leaf_index: i,
      chain_seq: e.chain_seq,
      event_id: e.id,
      row_hash_bytes: bytesToBytea(leafBytes[i]),
    })),
    p_tsrs: successes.map((s) => ({
      tsa_name: s.tsa.name,
      tsa_url: s.tsa.url,
      tsr_der: bytesToBytea(s.tsrDer),
      gen_time: s.genTime.toISOString(),
      serial_number: s.serialNumber,
      nonce: s.nonce ? bytesToBytea(s.nonce) : null,
      tsa_cert_chain: s.certChainDer ? bytesToBytea(s.certChainDer) : null,
    })),
  };

  const { data: batchIdData, error: insErr } = await admin.rpc(
    "sp_write_anchor_batch",
    batchPayload,
  );
  if (insErr) {
    throw new Error(`anchor: sp_write_anchor_batch failed: ${insErr.message}`);
  }
  const batchId = Number(batchIdData);

  // 7. Partial success → warning issue.
  if (failures.length > 0) {
    await recordIssue({
      fingerprint: `pilot-lifecycle-anchor:partial:${batchId}`,
      level: "warning",
      issueKind: "pilot.lifecycle.chain.anchor",
      companyId: null,
      firmId: null,
      tags: {
        batch_id: String(batchId),
        succeeded: successes.map((s) => s.tsa.name).join(","),
        failed: failures.map((f) => f.name).join(","),
      },
      extra: { failures },
      message: `Chain anchor partial: ${successes.length}/${endpoints.length} TSAs signed batch ${batchId}. Continuing.`,
    });
  }

  return {
    anchored: events.length,
    batchId,
    tsasOk: successes.map((s) => s.tsa.name),
    tsasFailed: failures,
    merkleRootHex: bytesToHex(root),
  };
}

function bytesToBytea(bytes: Uint8Array): string {
  return `\\x${bytesToHex(bytes)}`;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
