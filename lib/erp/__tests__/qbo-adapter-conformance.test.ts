import { describe, it, expect } from "vitest";
import { quickBooksAdapter } from "../quickbooks/adapter";
import { QBO_CAPABILITIES } from "../quickbooks/capabilities";
import type { AccountingWriteProvider, ProviderCapabilities } from "../types";

describe("QuickBooksAdapter — AccountingWriteProvider conformance", () => {
  const adapter: AccountingWriteProvider = quickBooksAdapter;

  it("declares providerId=quickbooks", () => {
    expect(adapter.providerId).toBe("quickbooks");
  });

  it("exposes complete ProviderCapabilities", () => {
    const caps: ProviderCapabilities = adapter.capabilities;
    // Every field must be a defined, typed value — NEVER undefined
    expect(typeof caps.supportsHeaderLevelCurrency).toBe("boolean");
    expect(typeof caps.supportsPerLineCurrency).toBe("boolean");
    expect(typeof caps.nativeIdempotency).toBe("boolean");
    expect(typeof caps.callerSuppliesCurrency).toBe("boolean");
    expect(typeof caps.singleCallJournalEntry).toBe("boolean");
    expect(typeof caps.requiresSubsidiaryId).toBe("boolean");
    expect(typeof caps.requiresJournalBatch).toBe("boolean");
    expect(typeof caps.maxDimensionsPerLine).toBe("number");
    expect(typeof caps.dimensionsAreDynamicPerCustomer).toBe("boolean");
    expect(Array.isArray(caps.forbiddenAccountTypes)).toBe(true);
    expect(["rpm_per_tenant", "rpm_per_realm", "concurrency_pool", "soft_dynamic"]).toContain(
      caps.rateLimitModel,
    );
    expect(["signed_amount", "discriminated_side"]).toContain(caps.signConvention);
    expect(typeof caps.supportsDistinctReversalDate).toBe("boolean");
  });

  it("QBO capabilities match research doc §9", () => {
    expect(QBO_CAPABILITIES.signConvention).toBe("discriminated_side");
    expect(QBO_CAPABILITIES.maxDimensionsPerLine).toBe(2);
    expect(QBO_CAPABILITIES.nativeIdempotency).toBe(false);
    expect(QBO_CAPABILITIES.requiresSubsidiaryId).toBe(false);
    expect(QBO_CAPABILITIES.requiresJournalBatch).toBe(false);
  });

  it("implements all AccountingWriteProvider methods", () => {
    expect(typeof adapter.postJournalEntry).toBe("function");
    expect(typeof adapter.voidJournalEntry).toBe("function");
    expect(typeof adapter.getJournalEntry).toBe("function");
    expect(typeof adapter.preflight).toBe("function");
    expect(typeof adapter.checkHealth).toBe("function");
  });
});
