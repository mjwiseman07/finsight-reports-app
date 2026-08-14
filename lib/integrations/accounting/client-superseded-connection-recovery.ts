/**
 * Client-side recovery when an explicit connectionId points at a superseded grant.
 *
 * Server remains fail-closed (409 ACCOUNTING_CONNECTION_SUPERSEDED). When the
 * response includes a validated successorConnectionId, the client may repair
 * navigation/routing identity and retry once — then fetch fresh authoritative
 * data from the successor.
 *
 * Never rewrite historical evidence (normalizedData / authoritativePersistence /
 * persistedSyncRecord) so an old payload appears to have originated from the
 * successor connection.
 */

export const ACCOUNTING_CONNECTION_SUPERSEDED_CODE = "ACCOUNTING_CONNECTION_SUPERSEDED" as const;

/** Demo superseded grant → canonical connected grant (production fixture). */
export const DEMO_SUPERSEDED_CONNECTION_ID = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";
export const DEMO_CANONICAL_CONNECTION_ID = "b718823a-0eb8-437d-beba-05c41f6482f9";

export const SUPERSEDED_RECOVERY_OBSERVABILITY_KEY = "advisacor_accounting_lifecycle_events";

/** Client routing/context identity fields that may be repaired pre-retry. */
export const REPAIRABLE_CLIENT_CONNECTION_ID_FIELDS = [
  "connectionId",
  "reportDataContext.connectionId",
] as const;

/** Provenance / evidence fields that must never be rewritten by client recovery. */
export const PROVENANCE_CONNECTION_ID_FIELDS = [
  "normalizedData.connectionId",
  "reportDataContext.normalizedData.connectionId",
  "authoritativePersistence.connectionId",
  "persistedSyncRecord.connectionId",
  "reportDataContext.authoritativePersistence.connectionId",
  "reportDataContext.persistedSyncRecord.connectionId",
] as const;

export type SupersededRecoveryDecision =
  | {
      shouldRetry: true;
      successorConnectionId: string;
      reason: "recoverable_superseded";
    }
  | {
      shouldRetry: false;
      successorConnectionId: null;
      reason:
        | "already_retried"
        | "wrong_status"
        | "missing_or_mismatched_code"
        | "missing_successor"
        | "successor_equals_requested"
        | "body_connection_mismatch";
    };

export type SupersededRecoveryObservation = {
  eventType: "accounting_connection_superseded_recovered" | "accounting_connection_superseded_retry_skipped";
  metadata: {
    staleConnectionId: string;
    successorConnectionId: string | null;
    reason: string;
    path?: string;
  };
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseSupersededSuccessorConnectionId(body: unknown): string | null {
  const record = asRecord(body);
  if (!record) return null;
  if (String(record.code || "") !== ACCOUNTING_CONNECTION_SUPERSEDED_CODE) return null;
  const successor = String(record.successorConnectionId || "").trim();
  return successor || null;
}

/**
 * Exact recoverable signal: HTTP 409 + ACCOUNTING_CONNECTION_SUPERSEDED +
 * non-empty validated successor that differs from the requested id.
 */
export function decideSupersededClientRecovery(args: {
  httpStatus: number;
  body: unknown;
  requestedConnectionId: string;
  alreadyRetried: boolean;
}): SupersededRecoveryDecision {
  if (args.alreadyRetried) {
    return { shouldRetry: false, successorConnectionId: null, reason: "already_retried" };
  }

  if (args.httpStatus !== 409) {
    return { shouldRetry: false, successorConnectionId: null, reason: "wrong_status" };
  }

  const record = asRecord(args.body);
  if (!record || String(record.code || "") !== ACCOUNTING_CONNECTION_SUPERSEDED_CODE) {
    return { shouldRetry: false, successorConnectionId: null, reason: "missing_or_mismatched_code" };
  }

  const requested = String(args.requestedConnectionId || "").trim();
  const bodyConnectionId = String(record.connectionId || "").trim();
  if (bodyConnectionId && requested && bodyConnectionId !== requested) {
    return { shouldRetry: false, successorConnectionId: null, reason: "body_connection_mismatch" };
  }

  const successor = parseSupersededSuccessorConnectionId(args.body);
  if (!successor) {
    return { shouldRetry: false, successorConnectionId: null, reason: "missing_successor" };
  }

  if (successor === requested) {
    return { shouldRetry: false, successorConnectionId: null, reason: "successor_equals_requested" };
  }

  return {
    shouldRetry: true,
    successorConnectionId: successor,
    reason: "recoverable_superseded",
  };
}

/**
 * Replace only connectionId=stale when present. All other query params preserved.
 */
export function replaceStaleConnectionIdInUrl(
  href: string,
  staleConnectionId: string,
  successorConnectionId: string,
): string {
  const stale = String(staleConnectionId || "").trim();
  const successor = String(successorConnectionId || "").trim();
  if (!stale || !successor || stale === successor) return href;

  const absolute = /^https?:\/\//i.test(href);
  const url = new URL(href, "https://www.advisacor.com");
  if (url.searchParams.get("connectionId") === stale) {
    url.searchParams.set("connectionId", successor);
  }
  if (absolute) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

type PayloadLike = Record<string, unknown> | null | undefined;

/**
 * Repair only client routing/context identity:
 *   - payload.connectionId
 *   - reportDataContext.connectionId
 *
 * Does NOT rewrite provenance evidence:
 *   - normalizedData.connectionId
 *   - reportDataContext.normalizedData.connectionId
 *   - authoritativePersistence.connectionId
 *   - persistedSyncRecord.connectionId
 *
 * Callers must not persist a pre-retry routing repair as if it were a fresh
 * authoritative payload from the successor. Persist only after a successful
 * fetch of successor-backed data.
 */
export function replaceStaleConnectionIdInClientPayload<T extends PayloadLike>(
  payload: T,
  staleConnectionId: string,
  successorConnectionId: string,
): T {
  if (!payload || typeof payload !== "object") return payload;
  const stale = String(staleConnectionId || "").trim();
  const successor = String(successorConnectionId || "").trim();
  if (!stale || !successor || stale === successor) return payload;

  const next: Record<string, unknown> = { ...payload };
  if (String(next.connectionId || "") === stale) {
    next.connectionId = successor;
  }

  const reportDataContext = asRecord(next.reportDataContext);
  if (reportDataContext) {
    const contextNext = { ...reportDataContext };
    if (String(contextNext.connectionId || "") === stale) {
      contextNext.connectionId = successor;
    }
    // Intentionally leave nested normalizedData / authoritativePersistence /
    // persistedSyncRecord untouched — those are historical evidence.
    next.reportDataContext = contextNext;
  }

  return next as T;
}

export function buildSupersededRecoveryObservation(args: {
  recovered: boolean;
  staleConnectionId: string;
  successorConnectionId: string | null;
  reason: string;
  path?: string;
}): SupersededRecoveryObservation {
  return {
    eventType: args.recovered
      ? "accounting_connection_superseded_recovered"
      : "accounting_connection_superseded_retry_skipped",
    metadata: {
      staleConnectionId: args.staleConnectionId,
      successorConnectionId: args.successorConnectionId,
      reason: args.reason,
      ...(args.path ? { path: args.path } : {}),
    },
    createdAt: new Date().toISOString(),
  };
}

/** Append a lifecycle observation without throwing (browser-only). */
export function recordSupersededRecoveryObservation(
  observation: SupersededRecoveryObservation,
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof window !== "undefined" ? window.localStorage : null,
): void {
  if (!storage) return;
  try {
    const current = JSON.parse(storage.getItem(SUPERSEDED_RECOVERY_OBSERVABILITY_KEY) || "[]");
    const events = Array.isArray(current) ? current : [];
    events.push(observation);
    storage.setItem(SUPERSEDED_RECOVERY_OBSERVABILITY_KEY, JSON.stringify(events.slice(-50)));
  } catch {
    // Observability must never break recovery.
  }
}

/**
 * Apply URL + routing-context identity repair for a recoverable 409.
 * Does not mutate provenance evidence. Caller owns the single retry and must
 * persist storage only after a successful successor fetch.
 */
export function applySupersededClientContextReplacement(args: {
  href: string;
  payload: PayloadLike;
  staleConnectionId: string;
  successorConnectionId: string;
}): {
  href: string;
  payload: PayloadLike;
} {
  return {
    href: replaceStaleConnectionIdInUrl(args.href, args.staleConnectionId, args.successorConnectionId),
    payload: replaceStaleConnectionIdInClientPayload(
      args.payload,
      args.staleConnectionId,
      args.successorConnectionId,
    ),
  };
}
