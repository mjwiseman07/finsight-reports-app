import { describe, test, expect } from "vitest";
import { writeEnabled, writeDisabledReason } from "@/lib/accounting/write-boundary/kill-switch";
import type { WriteBoundaryConnection } from "@/lib/accounting/write-boundary/types";

const baseConn = (overrides: Partial<WriteBoundaryConnection> = {}): WriteBoundaryConnection => ({
  id: "conn-1",
  provider: "xero",
  tenant_or_realm_id: "tenant-1",
  status: "connected",
  metadata_json: {},
  home_currency: "USD",
  ...overrides,
});

describe("writeEnabled", () => {
  test("default false when metadata_json is empty", () => {
    expect(writeEnabled(baseConn())).toBe(false);
  });

  test("true only when write_enabled_xero is boolean true", () => {
    expect(writeEnabled(baseConn({ metadata_json: { write_enabled_xero: true } }))).toBe(true);
  });

  test("string 'true' does NOT enable", () => {
    expect(writeEnabled(baseConn({ metadata_json: { write_enabled_xero: "true" } }))).toBe(false);
  });

  test("QBO uses write_enabled_quickbooks key", () => {
    expect(
      writeEnabled(
        baseConn({
          provider: "quickbooks",
          metadata_json: { write_enabled_quickbooks: true },
        }),
      ),
    ).toBe(true);
    // Cross-key does NOT enable
    expect(
      writeEnabled(
        baseConn({
          provider: "quickbooks",
          metadata_json: { write_enabled_xero: true },
        }),
      ),
    ).toBe(false);
  });
});

describe("writeDisabledReason", () => {
  test("includes connection id, provider, and the metadata key to flip", () => {
    const reason = writeDisabledReason(baseConn({ id: "abc123" }));
    expect(reason).toContain("abc123");
    expect(reason).toContain("xero");
    expect(reason).toContain("write_enabled_xero");
    expect(reason).toContain("/api/admin/write-boundary/enable");
  });
});
