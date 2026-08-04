import {
  composeCanonicalPayload,
  type LifecycleEventForCanonicalization,
} from "./canonical-payload";

/**
 * Browser-safe hash-chain verifier. Uses Web Crypto subtle.digest (SHA-256).
 *
 * Verifies each row: row_hash === 'sha256:' || hex(sha256(prev_hash || canonical))
 * and that prev_hash matches the immediately-prior row's row_hash within
 * the slice (or is NULL for the first row).
 *
 * Input events must be sorted by chain_seq ASC.
 *
 * Note: consecutive chain_seq is NOT required — Block 2.5 burns one nextval
 * per insert under the advisory lock, so gaps are expected and must not fail.
 */

export type ChainRow = LifecycleEventForCanonicalization & {
  id: string;
  chain_seq: number;
  prev_hash: string | null;
  row_hash: string;
};

export type RowVerification = {
  id: string;
  chain_seq: number;
  ok: boolean;
  reason?:
    | "hash-mismatch"
    | "prev-hash-mismatch"
    | "missing-row-hash"
    | "chain-gap";
  expected_row_hash?: string;
  /** Informational only — gaps are expected from the BEFORE INSERT trigger. */
  seq_gap?: boolean;
};

export type ChainVerification = {
  ok: boolean;
  rows: RowVerification[];
  first_failure_index: number | null;
};

const enc = new TextEncoder();
const HASH_PREFIX = "sha256:";

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const subtle =
    (globalThis.crypto?.subtle as SubtleCrypto | undefined) ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("crypto").webcrypto.subtle as SubtleCrypto);
  const digest = await subtle.digest("SHA-256", enc.encode(input));
  return toHex(digest);
}

export async function verifyChain(rows: ChainRow[]): Promise<ChainVerification> {
  const results: RowVerification[] = [];
  let firstFailureIndex: number | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.row_hash) {
      const r: RowVerification = {
        id: row.id,
        chain_seq: row.chain_seq,
        ok: false,
        reason: "missing-row-hash",
      };
      results.push(r);
      firstFailureIndex ??= i;
      continue;
    }

    // Gaps in chain_seq are expected (DEFAULT nextval + trigger nextval).
    // Record for UI diagnostics but do not fail the chain.
    const seqGap =
      i > 0 && row.chain_seq !== rows[i - 1].chain_seq + 1;

    const expectedPrev = i === 0 ? null : rows[i - 1].row_hash;
    if ((row.prev_hash ?? null) !== expectedPrev) {
      const r: RowVerification = {
        id: row.id,
        chain_seq: row.chain_seq,
        ok: false,
        reason: "prev-hash-mismatch",
        seq_gap: seqGap || undefined,
      };
      results.push(r);
      firstFailureIndex ??= i;
      continue;
    }

    const canonical = composeCanonicalPayload(row);
    const input = (row.prev_hash ?? "") + canonical;
    const computed = `${HASH_PREFIX}${await sha256Hex(input)}`;

    if (computed !== row.row_hash) {
      const r: RowVerification = {
        id: row.id,
        chain_seq: row.chain_seq,
        ok: false,
        reason: "hash-mismatch",
        expected_row_hash: computed,
        seq_gap: seqGap || undefined,
      };
      results.push(r);
      firstFailureIndex ??= i;
      continue;
    }

    results.push({
      id: row.id,
      chain_seq: row.chain_seq,
      ok: true,
      seq_gap: seqGap || undefined,
    });
  }

  return {
    ok: firstFailureIndex === null,
    rows: results,
    first_failure_index: firstFailureIndex,
  };
}
