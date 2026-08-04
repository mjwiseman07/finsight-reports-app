import { describe, it, expect } from "vitest";
import { verifyChain, type ChainRow } from "../client-verifier";
import {
  composeCanonicalPayload,
  type LifecycleEventForCanonicalization,
} from "../canonical-payload";
import { webcrypto } from "crypto";

async function hash(
  prev: string | null,
  ev: LifecycleEventForCanonicalization,
): Promise<string> {
  const canonical = composeCanonicalPayload(ev);
  const input = (prev ?? "") + canonical;
  const digest = await webcrypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

const base: Omit<
  LifecycleEventForCanonicalization,
  "event_kind" | "event_at" | "from_status" | "to_status" | "payload"
> = {
  schema_version: "42.7E.1",
  firm_id: "00000000-0000-0000-0000-000000000100",
  company_id: null,
  pilot_slot_id: "00000000-0000-0000-0000-000000000010",
  classification_hint: null,
  actor_kind: "system",
  actor_user_id: null,
  actor_via: "admin-script",
  assertions_covered: [],
  evidence_refs: [],
  reason_code: "test",
  reason_text: null,
};

async function makeChain(): Promise<ChainRow[]> {
  const e1: LifecycleEventForCanonicalization = {
    ...base,
    event_kind: "pilot.lifecycle.created",
    event_at: "2026-08-04T20:00:00.000000Z",
    to_status: "pending",
    from_status: null,
    payload: {},
  };
  const h1 = await hash(null, e1);
  const e2: LifecycleEventForCanonicalization = {
    ...base,
    event_kind: "pilot.lifecycle.transition",
    event_at: "2026-08-04T20:01:00.000000Z",
    to_status: "active",
    from_status: "pending",
    payload: { stripe_event_id: "evt_1" },
  };
  const h2 = await hash(h1, e2);
  return [
    {
      id: "r1",
      chain_seq: 1,
      prev_hash: null,
      row_hash: h1,
      ...e1,
    },
    {
      id: "r2",
      chain_seq: 2,
      prev_hash: h1,
      row_hash: h2,
      ...e2,
    },
  ];
}

describe("verifyChain", () => {
  it("happy path — two-row chain verifies", async () => {
    const rows = await makeChain();
    const result = await verifyChain(rows);
    expect(result.ok).toBe(true);
    expect(result.rows.every((r) => r.ok)).toBe(true);
  });

  it("tampered payload detected as hash-mismatch", async () => {
    const rows = await makeChain();
    rows[1].payload = { stripe_event_id: "evt_TAMPERED" };
    const result = await verifyChain(rows);
    expect(result.ok).toBe(false);
    expect(result.first_failure_index).toBe(1);
    expect(result.rows[1].reason).toBe("hash-mismatch");
  });

  it("tampered prev_hash detected", async () => {
    const rows = await makeChain();
    rows[1].prev_hash = `sha256:${"a".repeat(64)}`;
    const result = await verifyChain(rows);
    expect(result.ok).toBe(false);
    expect(result.rows[1].reason).toBe("prev-hash-mismatch");
  });

  it("empty chain verifies as ok", async () => {
    const result = await verifyChain([]);
    expect(result.ok).toBe(true);
    expect(result.rows).toEqual([]);
  });

  it("single-row chain (chain_seq=1, prev_hash=null) verifies", async () => {
    const rows = await makeChain();
    const single = [rows[0]];
    const result = await verifyChain(single);
    expect(result.ok).toBe(true);
  });

  it("chain_seq gap is informational — does not fail when hashes link", async () => {
    const rows = await makeChain();
    rows[1].chain_seq = 3; // gap: Block 2.5 burns nextval — expected
    const result = await verifyChain(rows);
    expect(result.ok).toBe(true);
    expect(result.rows[1].ok).toBe(true);
    expect(result.rows[1].seq_gap).toBe(true);
  });
});
