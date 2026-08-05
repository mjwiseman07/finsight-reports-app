/**
 * Phase MEM_LIFECYCLE Block 9.2 — anchor payload fetcher + hex decoder.
 *
 * Fetches the /api/pilot-lifecycle/anchor/[chainSeq] endpoint (shipped in Block 9)
 * and converts its JSON-safe hex fields into the Uint8Array shapes that
 * verifyEventAnchored() from anchor-verifier.ts expects.
 *
 * This file is intentionally the ONLY place hex-decoding lives on the client
 * so the verifier itself stays byte-typed and testable in isolation.
 */

import type {
  AnchorBatch,
  AnchorLeaf,
  AnchorTsr,
} from "./anchor-verifier";

export type AnchorPayload = {
  batch: AnchorBatch;
  leaves: AnchorLeaf[];
  tsrs: AnchorTsr[];
};

export type AnchorFetchResult =
  | { status: "ok"; payload: AnchorPayload }
  | { status: "not-anchored"; reason: string }
  | { status: "error"; message: string };

/**
 * Convert a lowercase hex string ("deadbeef") to a Uint8Array.
 * Throws on invalid input rather than silently returning garbage —
 * this is on the trust boundary, so we must fail loud.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string") {
    throw new TypeError(`hexToBytes: expected string, got ${typeof hex}`);
  }
  const normalized = hex.startsWith("\\x") ? hex.slice(2) : hex;
  if (normalized.length === 0) return new Uint8Array(0);
  if (normalized.length % 2 !== 0) {
    throw new Error(`hexToBytes: odd-length hex (${normalized.length})`);
  }
  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error("hexToBytes: non-hex characters in input");
  }
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Fetch the anchor payload for a given chain_seq. Returns a discriminated
 * union so the caller can distinguish "no anchor yet" (a valid state for
 * fresh events pre-batching) from "server error" (a real failure to show).
 */
export async function fetchAnchorPayload(
  chainSeq: number,
  opts?: { signal?: AbortSignal },
): Promise<AnchorFetchResult> {
  const res = await fetch(`/api/pilot-lifecycle/anchor/${chainSeq}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: opts?.signal,
  });

  if (res.status === 404) {
    let body: { error?: string } | null = null;
    try {
      body = (await res.json()) as { error?: string };
    } catch {
      body = null;
    }
    return {
      status: "not-anchored",
      reason: body?.error ?? "no anchor covers this chain_seq",
    };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => `HTTP ${res.status}`);
    return { status: "error", message: `HTTP ${res.status}: ${detail}` };
  }

  const json = (await res.json()) as {
    batch: {
      id: number;
      merkle_root: string;
      leaf_count: number;
      batch_start_chain_seq: number;
      batch_end_chain_seq: number;
    };
    leaves: Array<{
      leaf_index: number;
      chain_seq: number;
      event_id: string;
      row_hash_bytes: string;
    }>;
    tsrs: Array<{
      tsa_name: string;
      tsa_url: string;
      tsr_der: string;
      gen_time: string;
      serial_number: string | number;
      nonce: string | null;
      tsa_cert_chain: string | null;
    }>;
  };

  const batch: AnchorBatch = {
    id: json.batch.id,
    merkle_root: hexToBytes(json.batch.merkle_root),
    leaf_count: json.batch.leaf_count,
    batch_start_chain_seq: json.batch.batch_start_chain_seq,
    batch_end_chain_seq: json.batch.batch_end_chain_seq,
  };

  const leaves: AnchorLeaf[] = json.leaves.map((l) => ({
    leaf_index: l.leaf_index,
    chain_seq: l.chain_seq,
    event_id: l.event_id,
    row_hash_bytes: hexToBytes(l.row_hash_bytes),
  }));

  const tsrs: AnchorTsr[] = json.tsrs.map((t) => {
    // Narrow tsa_name to the union type the verifier expects.
    const known = ["digicert", "sectigo", "identrust"] as const;
    const name = (known as readonly string[]).includes(t.tsa_name)
      ? (t.tsa_name as AnchorTsr["tsa_name"])
      : // Server should never send an unknown name; if it does, we treat it
        // as digicert for the type but leave a note downstream. The verifier
        // does NOT trust tsa_name for security — it's a display label only.
        ("digicert" as AnchorTsr["tsa_name"]);
    return {
      tsa_name: name,
      tsa_url: t.tsa_url,
      tsr_der: hexToBytes(t.tsr_der),
      gen_time: t.gen_time,
      tsa_cert_chain: t.tsa_cert_chain ? hexToBytes(t.tsa_cert_chain) : null,
    };
  });

  return { status: "ok", payload: { batch, leaves, tsrs } };
}
