import { describe, expect, it } from "vitest";
import {
  ADDON_CODES,
  ADDON_REGISTRY,
  getAddonMetadata,
  isAddonCode,
  listAddonCodes,
} from "@/lib/entitlements/registry";

describe("entitlements/registry", () => {
  it("has exactly 15 add-on codes", () => {
    expect(ADDON_CODES.length).toBe(15);
  });

  it("has metadata for every code", () => {
    for (const code of ADDON_CODES) {
      const meta = getAddonMetadata(code);
      expect(meta.code).toBe(code);
      expect(meta.displayName.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(["ap", "ar", "collections"]).toContain(meta.category);
      if (!["ap_budget_controls", "ap_payment_interlock", "ap_banking_fanout"].includes(code)) {
        expect(meta.defaultMonthlyBaseCents).toBeGreaterThan(0);
      }
    }
  });

  it("isAddonCode gates unknown values", () => {
    expect(isAddonCode("ap_intake")).toBe(true);
    expect(isAddonCode("ap_pay")).toBe(true);
    expect(isAddonCode("ar_collections")).toBe(true);
    expect(isAddonCode("quarantine_review")).toBe(true);
    expect(isAddonCode("bookkeeping")).toBe(false);
    expect(isAddonCode("")).toBe(false);
    expect(isAddonCode(null)).toBe(false);
    expect(isAddonCode(undefined)).toBe(false);
    expect(isAddonCode(42)).toBe(false);
  });

  it("ADDON_REGISTRY key set matches ADDON_CODES", () => {
    expect(new Set(Object.keys(ADDON_REGISTRY))).toEqual(new Set(ADDON_CODES));
  });

  it("listAddonCodes returns a fresh array", () => {
    const a = listAddonCodes();
    const b = listAddonCodes();
    expect(a).toEqual(b);
    a.push("x" as never);
    expect(listAddonCodes().length).toBe(15);
  });

  it("ap_pay is standalone-capable", () => {
    expect(ADDON_REGISTRY.ap_pay.standaloneCapable).toBe(true);
  });

  it("ar_cash_app is standalone-capable", () => {
    expect(ADDON_REGISTRY.ar_cash_app.standaloneCapable).toBe(true);
  });

  it("ar_collections is standalone-capable (Janice's premium service)", () => {
    expect(ADDON_REGISTRY.ar_collections.standaloneCapable).toBe(true);
  });

  it("pricing defaults match locked pricing floor", () => {
    expect(ADDON_REGISTRY.ap_intake.defaultMonthlyBaseCents).toBe(9900);
    expect(ADDON_REGISTRY.ap_pay.defaultMonthlyBaseCents).toBe(14900);
    expect(ADDON_REGISTRY.ar_invoicing.defaultMonthlyBaseCents).toBe(9900);
    expect(ADDON_REGISTRY.ar_cash_app.defaultMonthlyBaseCents).toBe(14900);
    expect(ADDON_REGISTRY.ar_collections.defaultMonthlyBaseCents).toBe(24900);
    expect(ADDON_REGISTRY.voice_collections.defaultMonthlyBaseCents).toBe(9900);
    expect(ADDON_REGISTRY.quarantine_review.defaultMonthlyBaseCents).toBe(4900);
  });
});
