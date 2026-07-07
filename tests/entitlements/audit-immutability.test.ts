import { describe, expect, it } from "vitest";
import { ADDON_CODES } from "@/lib/entitlements/registry";

describe("entitlements/audit invariants (schema-level)", () => {
  it("audit table has no exposed mutation API in codebase", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("lib/entitlements/gate.ts", "utf8");
    expect(src.includes('.from("entitlement_check_audit")')).toBe(true);
    const badVerbs = src.match(/entitlement_check_audit[^\n]*\.(update|delete)\(/g);
    expect(badVerbs).toBeNull();
  });

  it("ADDON_CODES length is 11 (compile-time contract mirror)", () => {
    expect(ADDON_CODES).toEqual([
      "ap_intake",
      "ap_pay",
      "ar_invoicing",
      "ar_cash_app",
      "ar_collections",
      "voice_collections",
      "quarantine_review",
      "ap_requisitions",
      "ap_baseline_harvest",
      "ap_three_way_match",
      "ap_budget_controls",
    ]);
  });
});
