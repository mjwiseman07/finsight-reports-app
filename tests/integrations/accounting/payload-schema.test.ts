import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
  accountingPayloadNeedsSchemaRefresh,
  canPromoteClientPayloadAsAuthoritative,
  canUseFetchReportsFallbackAsSchemaPromotion,
  getAccountingPayloadSchemaVersion,
  persistedSyncNeedsSchemaRebuild,
  resolveAccountingAuthority,
  resolveXeroDashboardHydrationPlan,
  shouldDiscardStalePayloadAfterFailedRefresh,
  shouldRebuildPersistedAccountingSync,
} from "@/lib/integrations/accounting/payload-schema";

const connectionId = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";
const companyId = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const newSyncId = "11111111-1111-4111-8111-111111111111";

const currentPayload = {
  connectionId,
  sourceSystem: "xero",
  syncId: newSyncId,
  normalizedData: {
    sourceSystem: "xero",
    companyId,
    syncId: newSyncId,
    schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
  },
  reportDataContext: {
    connectionId,
    sourceSystem: "xero",
    syncId: newSyncId,
    normalizedData: {
      sourceSystem: "xero",
      companyId,
      syncId: newSyncId,
      schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
    },
  },
};

const stalePayload = {
  connectionId,
  sourceSystem: "xero",
  syncId: "dd59d698-200b-42cd-9810-4a4c455c9816",
  normalizedData: {
    sourceSystem: "xero",
    companyId,
  },
  reportDataContext: {
    connectionId,
    sourceSystem: "xero",
    normalizedData: {
      sourceSystem: "xero",
      companyId,
    },
  },
};

const okPersistence = {
  ok: true,
  syncId: newSyncId,
  schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
  activeNormalizedSyncId: newSyncId,
  companyId,
  connectionId,
  persisted: true,
  reason: "durable_success_sync",
};

describe("authoritative accounting persistence contract", () => {
  it("1: stale schema + forceRefresh hint rebuilds on server decision", () => {
    expect(
      shouldRebuildPersistedAccountingSync({
        forceRefresh: true,
        persistedSchemaVersion: 0,
        sourceSystem: "xero",
      }),
    ).toBe(true);
  });

  it("2: successful persisted refresh proof is promotable", () => {
    expect(
      canPromoteClientPayloadAsAuthoritative({
        payload: currentPayload,
        persistence: okPersistence,
      }),
    ).toBe(true);
  });

  it("3: transient success without persistence must not mark client current", () => {
    expect(
      canPromoteClientPayloadAsAuthoritative({
        payload: {
          ...currentPayload,
          authoritativePersistence: {
            ok: false,
            syncId: newSyncId,
            schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
            activeNormalizedSyncId: newSyncId,
            persisted: false,
            reason: "metadata_only",
          },
        },
      }),
    ).toBe(false);
    expect(shouldDiscardStalePayloadAfterFailedRefresh(true, false)).toBe(true);
  });

  it("4: fetch-reports fallback cannot silently promote stale schema without proof", () => {
    expect(
      canUseFetchReportsFallbackAsSchemaPromotion({
        schemaStale: true,
        payload: currentPayload,
        persistence: null,
      }),
    ).toBe(false);
    expect(
      canUseFetchReportsFallbackAsSchemaPromotion({
        schemaStale: true,
        payload: currentPayload,
        persistence: okPersistence,
      }),
    ).toBe(true);
  });

  it("5: current persisted schema does not require rebuild", () => {
    expect(persistedSyncNeedsSchemaRebuild(ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION)).toBe(false);
    expect(persistedSyncNeedsSchemaRebuild(2)).toBe(true);
    expect(
      shouldRebuildPersistedAccountingSync({
        forceRefresh: false,
        persistedSchemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
        sourceSystem: "xero",
      }),
    ).toBe(false);
  });

  it("6: stale localStorage + current server => accept server", () => {
    const authority = resolveAccountingAuthority({
      localSchemaVersion: 0,
      serverSchemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
      serverSyncId: newSyncId,
    });
    expect(authority.acceptServerPayload).toBe(true);
    expect(authority.requiresServerRebuild).toBe(false);
  });

  it("7: current localStorage + stale server => server authority wins / rebuild required", () => {
    const authority = resolveAccountingAuthority({
      localSchemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
      serverSchemaVersion: 0,
      serverSyncId: "dd59d698-200b-42cd-9810-4a4c455c9816",
    });
    expect(authority.requiresServerRebuild).toBe(true);
    expect(authority.acceptServerPayload).toBe(false);
    expect(
      shouldRebuildPersistedAccountingSync({
        forceRefresh: false,
        persistedSchemaVersion: 0,
        sourceSystem: "xero",
      }),
    ).toBe(true);
  });

  it("8: connected xero always reconciles once; no StrictMode multi-trigger from plan alone", () => {
    const first = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: currentPayload,
    });
    const second = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: currentPayload,
    });
    expect(first.shouldHydrate).toBe(true);
    expect(first.reconcileWithServer).toBe(true);
    expect(first.forceRefresh).toBe(false);
    expect(second.shouldHydrate).toBe(true);
    expect(second.forceRefresh).toBe(false);
  });

  it("9: connection/company identity preserved on hydration plan", () => {
    const plan = resolveXeroDashboardHydrationPlan({
      isXeroFromUrl: false,
      storedPayload: stalePayload,
    });
    expect(plan.connectionId).toBe(connectionId);
    expect(plan.sourceSystem).toBe("xero");
    expect(plan.forceRefresh).toBe(true);
    expect(stalePayload.normalizedData.companyId).toBe(companyId);
  });

  it("10: failed persistence proof blocks active pointer trust", () => {
    expect(
      canPromoteClientPayloadAsAuthoritative({
        payload: currentPayload,
        persistence: {
          ok: false,
          syncId: newSyncId,
          schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
          activeNormalizedSyncId: "dd59d698-200b-42cd-9810-4a4c455c9816",
          persisted: false,
          reason: "pointer_not_updated",
        },
      }),
    ).toBe(false);
  });

  it("legacy: OAuth callback remains forceRefresh", () => {
    const plan = resolveXeroDashboardHydrationPlan({
      connectionIdFromUrl: connectionId,
      isXeroFromUrl: true,
      storedPayload: currentPayload,
    });
    expect(plan.forceRefresh).toBe(true);
  });

  it("legacy: missing schemaVersion is stale", () => {
    expect(getAccountingPayloadSchemaVersion(stalePayload)).toBe(0);
    expect(accountingPayloadNeedsSchemaRefresh(stalePayload)).toBe(true);
  });
});
