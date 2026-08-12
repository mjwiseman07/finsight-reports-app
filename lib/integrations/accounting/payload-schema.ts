/**
 * Version stamp for persisted / localStorage accounting payloads.
 *
 * Bump when normalized row semantics change such that an existing SUCCESS
 * sync must be force-refreshed (not merely recomputed in the browser).
 *
 * v2 — Xero multi-column BS selects the current-period amount cell, and
 * canonical bank-overdraft classification is applied during normalize.
 * Pre-v2 syncs (e.g. dd59d698 with prior-year Checking 4540.98) must not
 * remain authoritative in localStorage.
 */
export const ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION = 2;

type PayloadLike = {
  schemaVersion?: number | null;
  connectionId?: string | null;
  sourceSystem?: string | null;
  normalizedData?: {
    schemaVersion?: number | null;
    sourceSystem?: string | null;
    companyId?: string | null;
  } | null;
  reportDataContext?: {
    connectionId?: string | null;
    sourceSystem?: string | null;
    normalizedData?: {
      schemaVersion?: number | null;
      sourceSystem?: string | null;
      companyId?: string | null;
    } | null;
  } | null;
} | null | undefined;

export function getAccountingPayloadSchemaVersion(payload: PayloadLike): number {
  const version =
    payload?.normalizedData?.schemaVersion ??
    payload?.reportDataContext?.normalizedData?.schemaVersion ??
    payload?.schemaVersion ??
    0;
  return Number(version || 0);
}

export function accountingPayloadNeedsSchemaRefresh(payload: PayloadLike): boolean {
  return getAccountingPayloadSchemaVersion(payload) < ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION;
}

export type XeroDashboardHydrationPlan = {
  shouldHydrate: boolean;
  connectionId: string;
  forceRefresh: boolean;
  schemaStale: boolean;
  sourceSystem: "xero" | "";
};

/**
 * Decide whether dashboard should hydrate/refresh Xero context.
 * OAuth callback always force-refreshes. Stored payloads force-refresh only
 * when schemaVersion is missing/stale. Current schema does not refresh.
 */
export function resolveXeroDashboardHydrationPlan(input: {
  connectionIdFromUrl?: string | null;
  isXeroFromUrl: boolean;
  storedPayload: PayloadLike;
}): XeroDashboardHydrationPlan {
  const storedContext = input.storedPayload?.reportDataContext || input.storedPayload || null;
  const storedConnectionId = String(
    input.connectionIdFromUrl ||
      storedContext?.connectionId ||
      input.storedPayload?.connectionId ||
      "",
  );
  const storedSourceSystem = String(
    storedContext?.sourceSystem ||
      input.storedPayload?.normalizedData?.sourceSystem ||
      input.storedPayload?.sourceSystem ||
      "",
  ).toLowerCase();
  const schemaStale = accountingPayloadNeedsSchemaRefresh(input.storedPayload);
  const shouldHydrateStoredXero =
    Boolean(storedConnectionId) && storedSourceSystem === "xero" && (input.isXeroFromUrl || schemaStale);

  if (input.isXeroFromUrl) {
    return {
      shouldHydrate: true,
      connectionId: String(input.connectionIdFromUrl || storedConnectionId || ""),
      forceRefresh: true,
      schemaStale,
      sourceSystem: "xero",
    };
  }

  if (shouldHydrateStoredXero) {
    return {
      shouldHydrate: true,
      connectionId: storedConnectionId,
      forceRefresh: schemaStale,
      schemaStale,
      sourceSystem: "xero",
    };
  }

  return {
    shouldHydrate: false,
    connectionId: "",
    forceRefresh: false,
    schemaStale,
    sourceSystem: "",
  };
}

/**
 * After a failed refresh, never keep known-stale accounting numbers as the
 * authoritative Scorecard payload.
 */
export function shouldDiscardStalePayloadAfterFailedRefresh(
  schemaStale: boolean,
  refreshProducedUsablePayload: boolean,
): boolean {
  return schemaStale && !refreshProducedUsablePayload;
}
