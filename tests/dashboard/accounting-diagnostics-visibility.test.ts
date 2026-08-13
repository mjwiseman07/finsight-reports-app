import { describe, expect, it } from "vitest";
import {
  isExplicitAccountingDiagnosticsMode,
  shouldShowAccountingDiagnostics,
} from "@/lib/dashboard/accounting-diagnostics-visibility";

describe("shouldShowAccountingDiagnostics", () => {
  it("A: normal customer — panel absent", () => {
    expect(
      shouldShowAccountingDiagnostics({
        customerViewMode: false,
        isPrivilegedRole: false,
        explicitInternalMode: false,
      }),
    ).toBe(false);
  });

  it("B: customerView=true — panel absent even if privileged + debug", () => {
    expect(
      shouldShowAccountingDiagnostics({
        customerViewMode: true,
        isPrivilegedRole: true,
        explicitInternalMode: true,
      }),
    ).toBe(false);
  });

  it("C: non-admin + debugAccounting — panel absent", () => {
    expect(
      shouldShowAccountingDiagnostics({
        customerViewMode: false,
        isPrivilegedRole: false,
        explicitInternalMode: true,
      }),
    ).toBe(false);
  });

  it("D: privileged + superAdmin/debug — panel visible", () => {
    expect(
      shouldShowAccountingDiagnostics({
        customerViewMode: false,
        isPrivilegedRole: true,
        explicitInternalMode: true,
      }),
    ).toBe(true);
  });

  it("privileged without explicit mode — panel absent", () => {
    expect(
      shouldShowAccountingDiagnostics({
        customerViewMode: false,
        isPrivilegedRole: true,
        explicitInternalMode: false,
      }),
    ).toBe(false);
  });
});

describe("isExplicitAccountingDiagnosticsMode", () => {
  it("accepts superAdmin or debugAccounting only", () => {
    expect(isExplicitAccountingDiagnosticsMode(new URLSearchParams("superAdmin=true"))).toBe(true);
    expect(isExplicitAccountingDiagnosticsMode(new URLSearchParams("debugAccounting=true"))).toBe(true);
    expect(isExplicitAccountingDiagnosticsMode(new URLSearchParams("customerView=true"))).toBe(false);
    expect(isExplicitAccountingDiagnosticsMode(new URLSearchParams(""))).toBe(false);
  });
});
