import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emitWriteLifecycleEvent,
  computeRequestHash,
} from "@/lib/accounting/write-boundary/event-emitter";
import type {
  WriteLifecyclePayload,
  JournalEntry,
} from "@/lib/accounting/write-boundary/types";

function fakeInsertSuccess(insertedId = "evt-new") {
  const insertMock = vi.fn().mockReturnValue({
    select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: insertedId }, error: null }) }),
  });
  return { from: () => ({ insert: insertMock }), insertMock };
}

function fakeInsertFailure() {
  const insertMock = vi.fn().mockReturnValue({
    select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: "boom" } }) }),
  });
  return { from: () => ({ insert: insertMock }), insertMock };
}

const basePayload: WriteLifecyclePayload = {
  connection_id: "c1",
  tenant_id: "t1",
  source_system: "xero",
  external_ref: "ext-1",
  narration: "n",
  journal_date: "2026-08-08",
  currency: "USD",
  line_count: 2,
  total_debits: 100,
  total_credits: 100,
  request_hash: "abc",
  provenance: "live",
};

describe("emitWriteLifecycleEvent", () => {
  test("writes with correct static fields", async () => {
    const { from, insertMock } = fakeInsertSuccess();
    const id = await emitWriteLifecycleEvent({
      admin: { from } as unknown as SupabaseClient,
      pilotSlotId: "slot-1",
      eventKind: "pilot.lifecycle.write-validated",
      payload: basePayload,
    });
    expect(id).toBe("evt-new");
    const call = insertMock.mock.calls[0][0];
    expect(call.pilot_slot_id).toBe("slot-1");
    expect(call.event_kind).toBe("pilot.lifecycle.write-validated");
    expect(call.actor_kind).toBe("system");
    expect(call.actor_via).toBe("accounting-sync");
    expect(call.from_status).toBe("active");
    expect(call.to_status).toBe("active");
    expect(call.reason_code).toBe("accounting.write.validated");
    // Trigger-derived fields MUST NOT be set
    expect(call.prev_hash).toBeUndefined();
    expect(call.row_hash).toBeUndefined();
    expect(call.chain_seq).toBeUndefined();
    expect(call.company_id).toBeUndefined();
    expect(call.firm_id).toBeUndefined();
  });

  test.each([
    ["pilot.lifecycle.write-validated", "accounting.write.validated"],
    ["pilot.lifecycle.write-rejected", "accounting.write.rejected"],
    ["pilot.lifecycle.write-posted", "accounting.write.posted"],
    ["pilot.lifecycle.write-drifted", "accounting.write.drifted"],
    ["pilot.lifecycle.write-void-succeeded", "accounting.write.void_succeeded"],
    ["pilot.lifecycle.write-failed", "accounting.write.failed"],
  ] as const)("reason_code for %s = %s", async (kind, expectedReason) => {
    const { from, insertMock } = fakeInsertSuccess();
    await emitWriteLifecycleEvent({
      admin: { from } as unknown as SupabaseClient,
      pilotSlotId: "slot-1",
      eventKind: kind,
      payload: basePayload,
    });
    expect(insertMock.mock.calls[0][0].reason_code).toBe(expectedReason);
  });

  test("returns null and does NOT throw on insert failure", async () => {
    const { from } = fakeInsertFailure();
    const result = await emitWriteLifecycleEvent({
      admin: { from } as unknown as SupabaseClient,
      pilotSlotId: "slot-1",
      eventKind: "pilot.lifecycle.write-validated",
      payload: basePayload,
    });
    expect(result).toBeNull();
    // Test passes = no throw
  });
});

describe("computeRequestHash", () => {
  const entry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
    tenantId: "t1",
    journalDate: "2026-08-08",
    narration: "n",
    lines: [
      { accountCode: "200", debit: 100, credit: 0 },
      { accountCode: "400", debit: 0, credit: 100 },
    ],
    currency: "USD",
    status: "DRAFT",
    externalRef: "ext-1",
    ...overrides,
  });

  test("same input yields same hash (deterministic)", () => {
    expect(computeRequestHash(entry())).toBe(computeRequestHash(entry()));
  });

  test("different input yields different hash", () => {
    expect(computeRequestHash(entry({ narration: "a" }))).not.toBe(
      computeRequestHash(entry({ narration: "b" })),
    );
  });

  test("key ordering does not affect hash", () => {
    // Same content, different property declaration order — should still hash the same
    const a: JournalEntry = {
      externalRef: "ext-1", currency: "USD", status: "DRAFT",
      lines: [{ accountCode: "200", debit: 100, credit: 0 }, { accountCode: "400", debit: 0, credit: 100 }],
      narration: "n", journalDate: "2026-08-08", tenantId: "t1",
    };
    const b: JournalEntry = {
      tenantId: "t1", journalDate: "2026-08-08", narration: "n",
      lines: [{ accountCode: "200", debit: 100, credit: 0 }, { accountCode: "400", debit: 0, credit: 100 }],
      currency: "USD", status: "DRAFT", externalRef: "ext-1",
    };
    expect(computeRequestHash(a)).toBe(computeRequestHash(b));
  });
});
