import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

/**
 * Phase MEM_LIFECYCLE Block 9 — read API for browser verifier.
 *
 * Given a chain_seq, returns the batch that anchors it, all leaves in the
 * batch (so the verifier can rebuild the Merkle tree), and all TSA responses.
 *
 * Auth: authenticated session (RLS SELECT policies are `USING (true)` on
 * anchor tables — proofs are public-safe once row_hash is known via
 * pilot_lifecycle_events RLS at the Timeline layer).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chainSeq: string }> },
) {
  const { chainSeq: chainSeqStr } = await params;
  const chainSeq = Number(chainSeqStr);
  if (!Number.isFinite(chainSeq) || chainSeq <= 0) {
    return NextResponse.json({ error: "invalid chain_seq" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: batch, error: bErr } = await admin
    .from("pilot_lifecycle_anchor_batches")
    .select("id, merkle_root, leaf_count, batch_start_chain_seq, batch_end_chain_seq")
    .lte("batch_start_chain_seq", chainSeq)
    .gte("batch_end_chain_seq", chainSeq)
    .is("superseded_by_anchor_batch_id", null)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  if (!batch) {
    return NextResponse.json(
      { error: "no anchor covers this chain_seq" },
      { status: 404 },
    );
  }

  const [{ data: leaves }, { data: tsrs }] = await Promise.all([
    admin
      .from("pilot_lifecycle_anchor_leaves")
      .select("leaf_index, chain_seq, event_id, row_hash_bytes")
      .eq("batch_id", batch.id)
      .order("leaf_index", { ascending: true }),
    admin
      .from("pilot_lifecycle_anchor_tsr")
      .select("tsa_name, tsa_url, tsr_der, gen_time, serial_number, nonce, tsa_cert_chain")
      .eq("batch_id", batch.id),
  ]);

  return NextResponse.json({
    batch: {
      id: batch.id as number,
      merkle_root: byteaToHex(batch.merkle_root),
      leaf_count: batch.leaf_count as number,
      batch_start_chain_seq: batch.batch_start_chain_seq as number,
      batch_end_chain_seq: batch.batch_end_chain_seq as number,
    },
    leaves: ((leaves ?? []) as Array<{
      leaf_index: number;
      chain_seq: number;
      event_id: string;
      row_hash_bytes: unknown;
    }>).map((l) => ({
      leaf_index: l.leaf_index,
      chain_seq: l.chain_seq,
      event_id: l.event_id,
      row_hash_bytes: byteaToHex(l.row_hash_bytes),
    })),
    tsrs: ((tsrs ?? []) as Array<{
      tsa_name: string;
      tsa_url: string;
      tsr_der: unknown;
      gen_time: string;
      serial_number: string | number;
      nonce: unknown;
      tsa_cert_chain: unknown;
    }>).map((t) => ({
      tsa_name: t.tsa_name,
      tsa_url: t.tsa_url,
      tsr_der: byteaToHex(t.tsr_der),
      gen_time: t.gen_time,
      serial_number: t.serial_number,
      nonce: t.nonce ? byteaToHex(t.nonce) : null,
      tsa_cert_chain: t.tsa_cert_chain ? byteaToHex(t.tsa_cert_chain) : null,
    })),
  });
}

/** Normalize PostgREST bytea (\\x hex, base64, or Uint8Array) → lowercase hex. */
function byteaToHex(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return v.slice(2).toLowerCase();
    if (/^[A-Za-z0-9+/=]+$/.test(v)) {
      try {
        return Buffer.from(v, "base64").toString("hex");
      } catch {
        return v;
      }
    }
    return v.toLowerCase();
  }
  if (v instanceof Uint8Array) {
    return Buffer.from(v).toString("hex");
  }
  return String(v);
}
