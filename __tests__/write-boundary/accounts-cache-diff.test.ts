import { describe, it, expect } from "vitest";
import {
  diffQboAccounts,
  diffXeroAccounts,
} from "@/lib/accounting/write-boundary/accounts-cache-diff";
import type {
  QboAccountSnapshot,
  XeroAccountSnapshot,
} from "@/lib/accounting/write-boundary/types";
import type {
  QboAccountUpsertInput,
  XeroAccountUpsertInput,
} from "@/lib/accounting/write-boundary/accounts-cache-repo";

// ---------- QBO ----------

function qboSnap(overrides: Partial<QboAccountSnapshot> = {}): QboAccountSnapshot {
  return {
    connection_id: "c1",
    realm_id: "r1",
    account_id: "1",
    account_name: "Cash",
    fully_qualified_name: "Cash",
    account_type: "Bank",
    account_sub_type: "Checking",
    classification: "Asset",
    active: true,
    currency_ref: "USD",
    parent_ref: null,
    meta_created_time: null,
    meta_last_updated_time: null,
    cached_at: "2026-08-01T00:00:00Z",
    raw_payload: { Id: "1", Name: "Cash", Active: true },
    ...overrides,
  };
}

function qboUp(overrides: Partial<QboAccountUpsertInput> = {}): QboAccountUpsertInput {
  return {
    connection_id: "c1",
    realm_id: "r1",
    account_id: "1",
    account_name: "Cash",
    fully_qualified_name: "Cash",
    account_type: "Bank",
    account_sub_type: "Checking",
    classification: "Asset",
    active: true,
    currency_ref: "USD",
    parent_ref: null,
    meta_created_time: null,
    meta_last_updated_time: null,
    raw_payload: { Id: "1", Name: "Cash", Active: true },
    ...overrides,
  };
}

describe("diffQboAccounts", () => {
  it("returns zeros when upstream matches cache exactly", () => {
    const cached = [qboSnap()];
    const upstream = [qboUp()];
    const d = diffQboAccounts(cached, upstream);
    expect(d).toEqual({
      addedCount: 0,
      updatedCount: 0,
      removedCount: 0,
      changedIdentifiers: [],
    });
  });

  it("detects added accounts (upstream row with no cache match)", () => {
    const cached = [qboSnap({ account_id: "1" })];
    const upstream = [
      qboUp({ account_id: "1" }),
      qboUp({
        account_id: "2",
        account_name: "AR",
        raw_payload: { Id: "2", Name: "AR", Active: true },
      }),
    ];
    const d = diffQboAccounts(cached, upstream);
    expect(d.addedCount).toBe(1);
    expect(d.updatedCount).toBe(0);
    expect(d.removedCount).toBe(0);
    expect(d.changedIdentifiers).toEqual(["2"]);
  });

  it("detects updated accounts (raw_payload changed)", () => {
    const cached = [qboSnap({ raw_payload: { Id: "1", Name: "Cash", Active: true } })];
    const upstream = [
      qboUp({ raw_payload: { Id: "1", Name: "Cash - Renamed", Active: true } }),
    ];
    const d = diffQboAccounts(cached, upstream);
    expect(d.updatedCount).toBe(1);
    expect(d.addedCount).toBe(0);
    expect(d.removedCount).toBe(0);
    expect(d.changedIdentifiers).toEqual(["1"]);
  });

  it("detects removed accounts (active in cache, missing upstream)", () => {
    const cached = [
      qboSnap({ account_id: "1", active: true }),
      qboSnap({ account_id: "2", account_name: "AR", active: true }),
    ];
    const upstream = [qboUp({ account_id: "1" })];
    const d = diffQboAccounts(cached, upstream);
    expect(d.removedCount).toBe(1);
    expect(d.changedIdentifiers).toContain("2");
  });

  it("does NOT count already-inactive cache rows as removed", () => {
    const cached = [
      qboSnap({ account_id: "1", active: true }),
      qboSnap({ account_id: "2", active: false }), // already inactive
    ];
    const upstream = [qboUp({ account_id: "1" })];
    const d = diffQboAccounts(cached, upstream);
    expect(d.removedCount).toBe(0);
  });
});

// ---------- Xero ----------

function xeroSnap(overrides: Partial<XeroAccountSnapshot> = {}): XeroAccountSnapshot {
  return {
    connection_id: "c1",
    tenant_id: "t1",
    account_id: "aid-1",
    account_code: "090",
    account_name: "Bank Account",
    account_type: "BANK",
    account_class: "ASSET",
    system_account: null,
    status: "ACTIVE",
    enable_payments_to_account: false,
    tax_type: null,
    description: null,
    updated_date_utc: null,
    cached_at: "2026-08-01T00:00:00Z",
    raw_payload: { AccountID: "aid-1", Code: "090", Name: "Bank Account", Status: "ACTIVE" },
    ...overrides,
  };
}

function xeroUp(overrides: Partial<XeroAccountUpsertInput> = {}): XeroAccountUpsertInput {
  return {
    connection_id: "c1",
    tenant_id: "t1",
    account_id: "aid-1",
    account_code: "090",
    account_name: "Bank Account",
    account_type: "BANK",
    account_class: "ASSET",
    system_account: null,
    status: "ACTIVE",
    enable_payments_to_account: false,
    tax_type: null,
    description: null,
    updated_date_utc: null,
    raw_payload: { AccountID: "aid-1", Code: "090", Name: "Bank Account", Status: "ACTIVE" },
    ...overrides,
  };
}

describe("diffXeroAccounts", () => {
  it("returns zeros on exact match", () => {
    const d = diffXeroAccounts([xeroSnap()], [xeroUp()]);
    expect(d).toEqual({
      addedCount: 0,
      updatedCount: 0,
      removedCount: 0,
      changedIdentifiers: [],
    });
  });

  it("keys on account_code (Xero business key)", () => {
    const cached = [xeroSnap({ account_code: "090" })];
    const upstream = [
      xeroUp({ account_code: "090" }),
      xeroUp({
        account_code: "091",
        account_id: "aid-2",
        raw_payload: { AccountID: "aid-2", Code: "091", Name: "Savings" },
      }),
    ];
    const d = diffXeroAccounts(cached, upstream);
    expect(d.addedCount).toBe(1);
    expect(d.changedIdentifiers).toEqual(["091"]);
  });

  it("detects updated on raw_payload change (e.g. rename)", () => {
    const cached = [xeroSnap({ raw_payload: { Code: "090", Name: "Old Name" } })];
    const upstream = [xeroUp({ raw_payload: { Code: "090", Name: "New Name" } })];
    const d = diffXeroAccounts(cached, upstream);
    expect(d.updatedCount).toBe(1);
    expect(d.changedIdentifiers).toEqual(["090"]);
  });

  it("only counts ACTIVE cache rows missing upstream as removed", () => {
    const cached = [
      xeroSnap({ account_code: "090", status: "ACTIVE" }),
      xeroSnap({ account_code: "091", status: "ARCHIVED" }),
      xeroSnap({ account_code: "092", status: "ACTIVE" }),
    ];
    const upstream = [xeroUp({ account_code: "090" })];
    const d = diffXeroAccounts(cached, upstream);
    expect(d.removedCount).toBe(1); // 092 only (091 was already archived)
    expect(d.changedIdentifiers).toContain("092");
    expect(d.changedIdentifiers).not.toContain("091");
  });
});
