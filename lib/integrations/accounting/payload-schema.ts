/**
 * Version stamp + authoritative persistence contract for accounting payloads.
 *
 * Bump ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION when normalized semantics
 * change such that an existing SUCCESS sync must be rebuilt server-side.
 *
 * v2 — Xero multi-column BS selects the current-period amount cell, and
 * canonical bank-overdraft classification is applied during normalize.
 *
 * v3 — Canonical due-date AR Aging schedule (open receivables + BS Tie-Out)
 * is persisted on normalized payloads for Scorecard past-due exposure.
 *
 * Hard rule: a corrected browser/localStorage calculation cannot outrank
 * stale authoritative accounting memory. Refresh is only complete when a
 * SUCCESS accounting_syncs row is persisted, active, and returned.
 */
export const ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION = 3;

type PayloadLike = {
  schemaVersion?: number | null;
  syncId?: string | null;
  connectionId?: string | null;
  sourceSystem?: string | null;
  authoritativePersistence?: AuthoritativePersistenceProof | null;
  normalizedData?: {
    schemaVersion?: number | null;
    sourceSystem?: string | null;
    companyId?: string | null;
    syncId?: string | null;
  } | null;
  reportDataContext?: {
    connectionId?: string | null;
    sourceSystem?: string | null;
    syncId?: string | null;
    normalizedData?: {
      schemaVersion?: number | null;
      sourceSystem?: string | null;
      companyId?: string | null;
      syncId?: string | null;
    } | null;
  } | null;
} | null | undefined;

export type AuthoritativePersistenceProof = {
  ok: boolean;
  syncId: string;
  schemaVersion: number;
  activeNormalizedSyncId: string;
  companyId?: string | null;
  connectionId?: string | null;
  persisted: boolean;
  reason?: string;
};

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

export function persistedSyncNeedsSchemaRebuild(persistedSchemaVersion: number | null | undefined): boolean {
  return Number(persistedSchemaVersion || 0) < ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION;
}

/**
 * Server decides whether to rebuild. Client forceRefresh is a hint only.
 * Stale persisted schema always rebuilds for supported live providers.
 */
export function shouldRebuildPersistedAccountingSync(input: {
  forceRefresh: boolean;
  persistedSchemaVersion?: number | null;
  sourceSystem?: string | null;
}): boolean {
  const provider = String(input.sourceSystem || "").toLowerCase();
  if (!["xero", "quickbooks"].includes(provider)) return false;
  if (input.forceRefresh) return true;
  return persistedSyncNeedsSchemaRebuild(input.persistedSchemaVersion);
}

/**
 * Browser payload may become authoritative only after durable sync proof.
 */
export function canPromoteClientPayloadAsAuthoritative(input: {
  payload: PayloadLike;
  persistence?: AuthoritativePersistenceProof | null;
}): boolean {
  const proof = input.persistence || input.payload?.authoritativePersistence || null;
  if (!proof?.ok || !proof.persisted) return false;
  if (!proof.syncId || proof.syncId !== proof.activeNormalizedSyncId) return false;
  if (Number(proof.schemaVersion || 0) < ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION) return false;
  const payloadVersion = getAccountingPayloadSchemaVersion(input.payload);
  if (payloadVersion < ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION) return false;
  const payloadSyncId = String(
    input.payload?.syncId ||
      input.payload?.normalizedData?.syncId ||
      input.payload?.reportDataContext?.syncId ||
      input.payload?.reportDataContext?.normalizedData?.syncId ||
      "",
  );
  if (payloadSyncId && payloadSyncId !== proof.syncId) return false;
  return true;
}

/**
 * Server memory wins over browser version stamps.
 * - stale local + current server => accept server (replace local)
 * - current local + stale server => rebuild required (do not trust local)
 */
export function resolveAccountingAuthority(input: {
  localSchemaVersion?: number | null;
  serverSchemaVersion?: number | null;
  serverSyncId?: string | null;
}): {
  serverIsCurrent: boolean;
  localIsCurrent: boolean;
  acceptServerPayload: boolean;
  requiresServerRebuild: boolean;
  reason: string;
} {
  const localIsCurrent = Number(input.localSchemaVersion || 0) >= ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION;
  const serverIsCurrent = Number(input.serverSchemaVersion || 0) >= ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION;
  if (!serverIsCurrent) {
    return {
      serverIsCurrent: false,
      localIsCurrent,
      acceptServerPayload: false,
      requiresServerRebuild: true,
      reason: "persisted_sync_schema_stale",
    };
  }
  return {
    serverIsCurrent: true,
    localIsCurrent,
    acceptServerPayload: Boolean(input.serverSyncId),
    requiresServerRebuild: false,
    reason: localIsCurrent ? "local_and_server_current" : "replace_stale_local_from_server",
  };
}

export type XeroDashboardHydrationPlan = {
  shouldHydrate: boolean;
  connectionId: string;
  forceRefresh: boolean;
  schemaStale: boolean;
  sourceSystem: "xero" | "";
  reconcileWithServer: boolean;
};

/**
 * Connected Xero dashboards always reconcile once with active-context so a
 * falsely-current local schemaVersion cannot suppress server rebuild.
 * forceRefresh is a client hint; server rebuilds whenever persisted schema is stale.
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
  const hasXeroConnection = Boolean(storedConnectionId) && (storedSourceSystem === "xero" || input.isXeroFromUrl);

  if (!hasXeroConnection) {
    return {
      shouldHydrate: false,
      connectionId: "",
      forceRefresh: false,
      schemaStale,
      sourceSystem: "",
      reconcileWithServer: false,
    };
  }

  return {
    shouldHydrate: true,
    connectionId: String(input.connectionIdFromUrl || storedConnectionId),
    forceRefresh: Boolean(input.isXeroFromUrl || schemaStale),
    schemaStale,
    sourceSystem: "xero",
    reconcileWithServer: true,
  };
}

/**
 * After a failed refresh, never keep known-stale accounting numbers as the
 * authoritative Scorecard payload.
 */
export function shouldDiscardStalePayloadAfterFailedRefresh(
  schemaStale: boolean,
  refreshProducedAuthoritativePayload: boolean,
): boolean {
  return schemaStale && !refreshProducedAuthoritativePayload;
}

/**
 * fetch-reports may persist, but a schema-stale hydration must not promote a
 * transient normalized body to "current" without authoritative persistence proof.
 */
export function canUseFetchReportsFallbackAsSchemaPromotion(input: {
  schemaStale: boolean;
  persistence?: AuthoritativePersistenceProof | null;
  payload: PayloadLike;
}): boolean {
  if (!input.schemaStale) return true;
  return canPromoteClientPayloadAsAuthoritative({
    payload: input.payload,
    persistence: input.persistence,
  });
}
