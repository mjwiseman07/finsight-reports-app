/**
 * Phase MEM_LIFECYCLE Block 9.2 — anchor-verify-queue tests.
 *
 * We deliberately mock fetch AND verifyEventAnchored so this test targets
 * ONLY the queue's dedup + concurrency-limit + cache-persistence contract.
 * Signature-verifier correctness is covered by cms-verify.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAnchorVerification,
  _clearAnchorVerifyCacheForTests,
} from "../anchor-verify-queue";

vi.mock("../anchor-fetch", () => ({
  fetchAnchorPayload: vi.fn(),
  hexToBytes: (h: string) => new Uint8Array(h.length / 2),
}));

vi.mock("../anchor-verifier", () => ({
  verifyEventAnchored: vi.fn(),
}));

import { fetchAnchorPayload } from "../anchor-fetch";
import { verifyEventAnchored } from "../anchor-verifier";

const mkOk = () => ({
  status: "ok" as const,
  payload: {
    batch: {
      id: 1,
      merkle_root: new Uint8Array(32),
      leaf_count: 1,
      batch_start_chain_seq: 1,
      batch_end_chain_seq: 1,
    },
    leaves: [],
    tsrs: [],
  },
});

const mkReport = (chainSeq: number, ok = true) => ({
  chain_seq: chainSeq,
  event_id: `evt-${chainSeq}`,
  batch_id: 1,
  merkle_ok: ok,
  merkle_expected_root_hex: "",
  merkle_actual_root_hex: "",
  tsrs: [],
  overallOk: ok,
  notes: [],
  version: "9.1" as const,
});

describe("anchor-verify-queue", () => {
  beforeEach(() => {
    _clearAnchorVerifyCacheForTests();
    vi.clearAllMocks();
    (fetchAnchorPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mkOk());
    (verifyEventAnchored as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ targetChainSeq }: { targetChainSeq: number }) => mkReport(targetChainSeq),
    );
  });

  it("returns cached promise for repeated calls with the same chain_seq", async () => {
    const p1 = getAnchorVerification(42);
    const p2 = getAnchorVerification(42);
    expect(p1).toBe(p2); // literal identity — this is the dedup guarantee
    const r1 = await p1;
    const r2 = await p2;
    expect(r1).toBe(r2);
    // fetch + verify each called exactly once despite two calls
    expect(fetchAnchorPayload).toHaveBeenCalledTimes(1);
    expect(verifyEventAnchored).toHaveBeenCalledTimes(1);
  });

  it("caches errors so a failing fetch is not retried on scroll", async () => {
    (fetchAnchorPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "error",
      message: "boom",
    });
    const r1 = await getAnchorVerification(99);
    const r2 = await getAnchorVerification(99);
    expect(r1).toEqual({ status: "error", message: "boom" });
    expect(r1).toBe(r2);
    expect(fetchAnchorPayload).toHaveBeenCalledTimes(1);
  });

  it("caches not-anchored so pre-batching rows don't re-fetch", async () => {
    (fetchAnchorPayload as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: "not-anchored",
      reason: "no anchor covers this chain_seq",
    });
    const r = await getAnchorVerification(101);
    expect(r).toEqual({
      status: "not-anchored",
      reason: "no anchor covers this chain_seq",
    });
    // Second call reuses the cached "not-anchored" result.
    const r2 = await getAnchorVerification(101);
    expect(r2).toBe(r);
    expect(fetchAnchorPayload).toHaveBeenCalledTimes(1);
  });

  it("limits concurrency to 4 in-flight verifications", async () => {
    // Make each verify wait on a manual gate so we can count in-flight jobs.
    let inFlight = 0;
    let peak = 0;
    const gates: Array<() => void> = [];
    (verifyEventAnchored as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ targetChainSeq }: { targetChainSeq: number }) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise<void>((resolve) => gates.push(resolve));
        inFlight--;
        return mkReport(targetChainSeq);
      },
    );

    // Kick off 10 verifications for 10 distinct chain_seqs.
    const promises = Array.from({ length: 10 }, (_, i) => getAnchorVerification(i + 1));

    // Wait for the queue to fill.
    await new Promise((r) => setTimeout(r, 30));
    // The scheduler.yield() before each job means we might not hit exactly 4
    // instantly, but we MUST never exceed 4.
    expect(peak).toBeLessThanOrEqual(4);

    // Release everything and confirm all resolve.
    gates.forEach((g) => g());
    // Some gates arrive after the initial release as later jobs schedule.
    for (let i = 0; i < 30 && gates.length < 10; i++) {
      await new Promise((r) => setTimeout(r, 10));
      // Drain any new gates.
      while (gates.length > 0) {
        const g = gates.shift()!;
        g();
      }
    }
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    expect(results.every((r) => r.status === "ok")).toBe(true);
    // Absolute cap check.
    expect(peak).toBeLessThanOrEqual(4);
  });

  it("propagates thrown errors from the verifier as {status:'error'}", async () => {
    (verifyEventAnchored as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("asn1 parse failed"),
    );
    const r = await getAnchorVerification(500);
    expect(r).toEqual({ status: "error", message: "asn1 parse failed" });
  });
});
