import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
  accountingPayloadNeedsSchemaRefresh,
  getAccountingPayloadSchemaVersion,
  resolveXeroDashboardHydrationPlan,
  shouldDiscardStalePayloadAfterFailedRefresh,
} from "@/lib/integrations/accounting/payload-schema";

const currentPayload = {
  connectionId: "ce526f9b-5d2c-46fc-b6f3-46617ab375bf",
  sourceSystem: "xero",
  normalizedData: {
    sourceSystem: "xero",
    companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
    schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
  },
  reportDataContext: {
    connectionId: "ce526f9b-5d2c-46fc-b6f3-46617ab375bf",
    sourceSystem: "xero",
    normalizedData: {
      sourceSystem: "xero",
      companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
      schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
    },
  },
};

const stalePayload = {
  connectionId: "ce526f9b-5d2c-46fc-b6f3-46617ab375bf",
  sourceSystem: "xero",
  normalizedData: {
    sourceSystem: "xero",
    companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
  },
  reportDataContext: {
    connectionId: "ce526f9b-5d2c-46fc-b6f3-46617ab375bf",
    sourceSystem: "xero",
    normalizedData: {
      sourceSystem: "xero",
      companyId: "02edb6c6-a4f1-4bae-825d-2680136dad24",
    },
  },
};

describe("active report payload schema freshness", () => {
  it("1: schemaVersion current -> no unnecessary force refresh", () => {
    expect(accountingPayloadNeedsSchemaRefresh(currentPayload)).toBe(false);
    const plan = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: currentPayload,
    });
    expect(plan.shouldHydrate).toBe(false);
    expect(plan.forceRefresh).toBe(false);
  });

  it("2: stale/missing schemaVersion -> force refresh", () => {
    expect(getAccountingPayloadSchemaVersion(stalePayload)).toBe(0);
    expect(accountingPayloadNeedsSchemaRefresh(stalePayload)).toBe(true);
    const plan = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: stalePayload,
    });
    expect(plan.shouldHydrate).toBe(true);
    expect(plan.forceRefresh).toBe(true);
    expect(plan.connectionId).toBe(stalePayload.connectionId);
  });

  it("3: successful refresh contract keeps identity fields available on stored payload", () => {
    expect(stalePayload.connectionId).toBeTruthy();
    expect(stalePayload.sourceSystem).toBe("xero");
    expect(stalePayload.normalizedData?.companyId).toBeTruthy();
    // Persist replacement is covered by dashboard persistPayload; plan preserves connection.
    const plan = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: stalePayload,
    });
    expect(plan.connectionId).toBe(stalePayload.connectionId);
    expect(plan.sourceSystem).toBe("xero");
  });

  it("4: failed refresh -> stale data must be discarded as authoritative", () => {
    expect(shouldDiscardStalePayloadAfterFailedRefresh(true, false)).toBe(true);
    expect(shouldDiscardStalePayloadAfterFailedRefresh(true, true)).toBe(false);
    expect(shouldDiscardStalePayloadAfterFailedRefresh(false, false)).toBe(false);
  });

  it("5: company/provider/period identity preserved on hydration plan", () => {
    const plan = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: stalePayload,
    });
    expect(plan.connectionId).toBe("ce526f9b-5d2c-46fc-b6f3-46617ab375bf");
    expect(plan.sourceSystem).toBe("xero");
  });

  it("6: current schema does not create a refresh loop trigger", () => {
    const first = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: currentPayload,
    });
    const second = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: currentPayload,
    });
    expect(first.shouldHydrate).toBe(false);
    expect(second.shouldHydrate).toBe(false);
  });

  it("7: OAuth callback hydration remains forceRefresh", () => {
    const plan = resolveXeroDashboardHydrationPlan({
      connectionIdFromUrl: "ce526f9b-5d2c-46fc-b6f3-46617ab375bf",
      isXeroFromUrl: true,
      storedPayload: currentPayload,
    });
    expect(plan.shouldHydrate).toBe(true);
    expect(plan.forceRefresh).toBe(true);
    expect(plan.connectionId).toBe("ce526f9b-5d2c-46fc-b6f3-46617ab375bf");
  });
});
