import { describe, it, expect } from "vitest";
import type {
  WriteLifecycleEventKind,
  CacheRefreshedPayload,
  WriteBoundaryLifecyclePayload,
  WriteLifecyclePayload,
} from "@/lib/accounting/write-boundary/types";

describe("WriteLifecycleEventKind — WBP W1c.4a extension", () => {
  it("includes pilot.lifecycle.cache-refreshed", () => {
    const kind: WriteLifecycleEventKind = "pilot.lifecycle.cache-refreshed";
    expect(kind).toBe("pilot.lifecycle.cache-refreshed");
  });

  it("still includes all six original write kinds", () => {
    const kinds: WriteLifecycleEventKind[] = [
      "pilot.lifecycle.write-validated",
      "pilot.lifecycle.write-rejected",
      "pilot.lifecycle.write-posted",
      "pilot.lifecycle.write-drifted",
      "pilot.lifecycle.write-void-succeeded",
      "pilot.lifecycle.write-failed",
    ];
    expect(kinds).toHaveLength(6);
  });
});

describe("CacheRefreshedPayload shape", () => {
  it("accepts a well-formed payload with all required fields", () => {
    const payload: CacheRefreshedPayload = {
      connection_id: "00000000-0000-0000-0000-000000000000",
      tenant_id: "9341457151063823",
      source_system: "quickbooks",
      total_accounts: 87,
      added_accounts: 3,
      updated_accounts: 12,
      removed_accounts: 1,
      refreshed_at: "2026-08-08T15:00:00.000Z",
      trigger: "manual",
      api_call_duration_ms: 847,
      pagination_pages: 1,
      changed_account_codes: ["6420", "4110", "1250"],
    };
    expect(payload.total_accounts).toBe(87);
  });

  it("accepts payload without optional changed_account_codes", () => {
    const payload: CacheRefreshedPayload = {
      connection_id: "conn-2",
      tenant_id: "t2",
      source_system: "xero",
      total_accounts: 45,
      added_accounts: 0,
      updated_accounts: 0,
      removed_accounts: 0,
      refreshed_at: "2026-08-08T15:00:00.000Z",
      trigger: "scheduled",
      api_call_duration_ms: 400,
      pagination_pages: 1,
    };
    expect(payload.changed_account_codes).toBeUndefined();
  });
});

describe("WriteBoundaryLifecyclePayload discriminated union", () => {
  it("accepts a WriteLifecyclePayload (back-compat for 15 existing call sites)", () => {
    const write: WriteLifecyclePayload = {
      connection_id: "c1",
      tenant_id: "t1",
      source_system: "quickbooks",
      external_ref: "idem-1",
      narration: "test",
      journal_date: "2026-08-01",
      currency: "USD",
      line_count: 2,
      total_debits: 100,
      total_credits: 100,
      request_hash: "abc",
      provenance: "live",
    };
    const union: WriteBoundaryLifecyclePayload = write;
    expect(union).toBeDefined();
  });

  it("accepts a CacheRefreshedPayload", () => {
    const cache: CacheRefreshedPayload = {
      connection_id: "c1",
      tenant_id: "t1",
      source_system: "quickbooks",
      total_accounts: 1,
      added_accounts: 0,
      updated_accounts: 0,
      removed_accounts: 0,
      refreshed_at: "2026-08-08T00:00:00Z",
      trigger: "manual",
      api_call_duration_ms: 100,
      pagination_pages: 1,
    };
    const union: WriteBoundaryLifecyclePayload = cache;
    expect(union).toBeDefined();
  });
});
