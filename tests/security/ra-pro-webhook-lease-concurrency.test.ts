/**
 * Concurrency contract tests for webhook lease claim/finalize RPCs.
 * Uses an in-process simulator mirroring SQL semantics (no live DB).
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

type Status =
  | "processing"
  | "processed"
  | "skipped"
  | "retryable"
  | "failed_conflict";

type Row = {
  stripe_event_id: string;
  processing_status: Status;
  lease_token: string | null;
  lease_expires_at: number | null;
  attempt_count: number;
  failure_code: string | null;
};

function claim(
  store: Map<string, Row>,
  eventId: string,
  now: number,
  ttlMs = 120_000,
): { outcome: string; lease_token?: string; processing_status?: string } {
  const existing = store.get(eventId);
  if (!existing) {
    const token = randomUUID();
    store.set(eventId, {
      stripe_event_id: eventId,
      processing_status: "processing",
      lease_token: token,
      lease_expires_at: now + ttlMs,
      attempt_count: 1,
      failure_code: null,
    });
    return { outcome: "claimed", lease_token: token };
  }
  const canReclaim =
    existing.processing_status === "retryable" ||
    (existing.processing_status === "processing" &&
      existing.lease_expires_at != null &&
      existing.lease_expires_at < now);
  if (canReclaim) {
    const token = randomUUID();
    existing.processing_status = "processing";
    existing.lease_token = token;
    existing.lease_expires_at = now + ttlMs;
    existing.attempt_count += 1;
    existing.failure_code = null;
    return { outcome: "reclaimed", lease_token: token };
  }
  if (
    existing.processing_status === "processed" ||
    existing.processing_status === "skipped" ||
    existing.processing_status === "failed_conflict"
  ) {
    return {
      outcome: "duplicate_terminal",
      processing_status: existing.processing_status,
    };
  }
  return { outcome: "lease_held", processing_status: existing.processing_status };
}

function finalize(
  store: Map<string, Row>,
  eventId: string,
  leaseToken: string,
  status: Exclude<Status, "processing">,
  failureCode: string | null = null,
): { ok: boolean; outcome: string } {
  const row = store.get(eventId);
  if (
    !row ||
    row.processing_status !== "processing" ||
    row.lease_token !== leaseToken
  ) {
    return { ok: false, outcome: "stale_lease" };
  }
  row.processing_status = status;
  row.failure_code = status === "retryable" || status === "failed_conflict" ? failureCode : null;
  if (status === "retryable") {
    row.lease_token = null;
    row.lease_expires_at = null;
  }
  return { ok: true, outcome: "finalized" };
}

describe("webhook lease concurrency contract (simulator)", () => {
  it("simultaneous first deliveries: only one claims", () => {
    const store = new Map<string, Row>();
    const a = claim(store, "evt", 1_000);
    const b = claim(store, "evt", 1_001);
    expect(a.outcome).toBe("claimed");
    expect(b.outcome).toBe("lease_held");
  });

  it("duplicate while lease active stays lease_held", () => {
    const store = new Map<string, Row>();
    claim(store, "evt", 1_000);
    expect(claim(store, "evt", 1_050).outcome).toBe("lease_held");
  });

  it("reclaim after lease expiry", () => {
    const store = new Map<string, Row>();
    const first = claim(store, "evt", 1_000, 100);
    expect(first.outcome).toBe("claimed");
    const second = claim(store, "evt", 1_200, 100);
    expect(second.outcome).toBe("reclaimed");
    expect(second.lease_token).not.toBe(first.lease_token);
  });

  it("retryable then later success", () => {
    const store = new Map<string, Row>();
    const c1 = claim(store, "evt", 1_000);
    expect(finalize(store, "evt", c1.lease_token!, "retryable", "missing_buyer_user").ok).toBe(
      true,
    );
    const c2 = claim(store, "evt", 1_100);
    expect(c2.outcome).toBe("reclaimed");
    expect(finalize(store, "evt", c2.lease_token!, "processed").ok).toBe(true);
    expect(store.get("evt")!.processing_status).toBe("processed");
  });

  it("stale worker cannot finalize after lease transfer", () => {
    const store = new Map<string, Row>();
    const c1 = claim(store, "evt", 1_000, 50);
    const c2 = claim(store, "evt", 1_100, 50);
    expect(c2.outcome).toBe("reclaimed");
    expect(finalize(store, "evt", c1.lease_token!, "processed").outcome).toBe("stale_lease");
    expect(finalize(store, "evt", c2.lease_token!, "processed").ok).toBe(true);
  });

  it("processed/skipped/conflict never reclaimed", () => {
    for (const terminal of ["processed", "skipped", "failed_conflict"] as const) {
      const store = new Map<string, Row>();
      const c = claim(store, "evt", 1_000);
      finalize(store, "evt", c.lease_token!, terminal, terminal === "failed_conflict" ? "x" : null);
      expect(claim(store, "evt", 9_999).outcome).toBe("duplicate_terminal");
    }
  });

  it("conflicting event remains operator-visible", () => {
    const store = new Map<string, Row>();
    const c = claim(store, "evt", 1_000);
    finalize(store, "evt", c.lease_token!, "failed_conflict", "pilot_cap_reached");
    const row = store.get("evt")!;
    expect(row.processing_status).toBe("failed_conflict");
    expect(row.failure_code).toBe("pilot_cap_reached");
    expect(claim(store, "evt", 2_000).outcome).toBe("duplicate_terminal");
  });
});
