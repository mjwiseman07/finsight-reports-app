/**
 * JE-3B1 — Read-only QBO JournalEntry adapters + correlation discovery.
 * Safe GET/query only. Never POST. Never call the legacy journal-entry poster.
 *
 * PrivateNote is NOT assumed queryable via QBO query language.
 * Discovery: bounded TxnDate window → client-side PrivateNote match → economics.
 *
 * CRITICAL: provider read failure ≠ successful empty / NOT_FOUND.
 * A failed query must never become NONE evidence of non-commit.
 */

import { qboApiFetch } from "@/lib/qbo/api-fetch.js";
import {
  hashNormalizedProviderJe,
  normalizeQboJournalEntry,
  privateNoteContainsCorrelationMarker,
  providerJeMatchesExpectedEconomics,
  type NormalizedProviderJe,
} from "./provider-je-normalize";
import type {
  JeDiscoveryResultKind,
  JeProviderErrorClass,
  JeReadByIdOutcome,
} from "./provider-attempt-types";

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export type QboReadAuth = {
  realmId: string;
  accessToken: string;
  /** Optional trace context — never used as connection authority. */
  userId?: string;
};

function classifyReadHttpError(status: number): JeProviderErrorClass {
  if (status === 401 || status === 403) return "AUTH_REJECTED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  if (status >= 400) return "DEFINITE_PROVIDER_REJECTION";
  return "NETWORK_UNCERTAIN";
}

export type ReadJournalEntryByIdResult = {
  outcome: JeReadByIdOutcome;
  /** @deprecated Prefer outcome === "FOUND". Kept for transitional callers. */
  found: boolean;
  normalized: NormalizedProviderJe | null;
  providerResponseHash: string | null;
  intuitTid: string | null;
  httpStatus: number;
  errorClass?: JeProviderErrorClass;
  reason?: string;
};

export async function readJournalEntryById(args: {
  auth: QboReadAuth;
  qboJeId: string;
}): Promise<ReadJournalEntryByIdResult> {
  const id = String(args.qboJeId || "").trim();
  if (!id) {
    return {
      outcome: "READ_FAILED",
      found: false,
      normalized: null,
      providerResponseHash: null,
      intuitTid: null,
      httpStatus: 0,
      errorClass: "PRE_SEND_FAILURE",
      reason: "missing_qbo_je_id",
    };
  }
  const url = `${qboApiBase()}/v3/company/${args.auth.realmId}/journalentry/${encodeURIComponent(id)}?minorversion=73`;
  try {
    const { ok, status, json, intuit_tid } = await qboApiFetch(url, {
      accessToken: args.auth.accessToken,
      method: "GET",
      context: args.auth.userId
        ? { userId: args.auth.userId, realmId: args.auth.realmId }
        : undefined,
    });

    if (status === 404) {
      return {
        outcome: "NOT_FOUND",
        found: false,
        normalized: null,
        providerResponseHash: null,
        intuitTid: intuit_tid ?? null,
        httpStatus: status,
        reason: "explicit_http_404",
      };
    }

    if (!ok) {
      return {
        outcome: "READ_FAILED",
        found: false,
        normalized: null,
        providerResponseHash: null,
        intuitTid: intuit_tid ?? null,
        httpStatus: status,
        errorClass: classifyReadHttpError(status),
        reason: `http_${status}`,
      };
    }

    const entity =
      (json?.JournalEntry as Record<string, unknown> | undefined) || null;
    if (!entity || !(entity.Id || entity.id)) {
      return {
        outcome: "READ_FAILED",
        found: false,
        normalized: null,
        providerResponseHash: null,
        intuitTid: intuit_tid ?? null,
        httpStatus: status,
        errorClass: "MALFORMED_SUCCESS",
        reason: "malformed_2xx_missing_journal_entry",
      };
    }

    const normalized = normalizeQboJournalEntry(entity);
    return {
      outcome: "FOUND",
      found: true,
      normalized,
      providerResponseHash: hashNormalizedProviderJe(normalized),
      intuitTid: intuit_tid ?? null,
      httpStatus: status,
    };
  } catch (err) {
    return {
      outcome: "READ_FAILED",
      found: false,
      normalized: null,
      providerResponseHash: null,
      intuitTid: null,
      httpStatus: 0,
      errorClass: "NETWORK_UNCERTAIN",
      reason:
        err instanceof Error ? err.message : "network_or_fetch_exception",
    };
  }
}

export type DiscoveryExpectedEconomics = {
  txnDate: string;
  currency: string;
  lines: Array<{
    accountId: string;
    debitCents: number;
    creditCents: number;
  }>;
  totalDebitsCents: number;
  totalCreditsCents: number;
};

export type FindJournalEntryByCorrelationResult = {
  kind: JeDiscoveryResultKind;
  matches: NormalizedProviderJe[];
  candidateCount: number;
  /** Why MULTIPLE / NONE / INDETERMINATE — for recovery metadata. */
  reason: string;
  httpStatus?: number;
  errorClass?: JeProviderErrorClass;
  intuitTid?: string | null;
};

export type QueryJournalEntriesResult =
  | {
      ok: true;
      rows: Record<string, unknown>[];
      httpStatus: number;
      intuitTid: string | null;
    }
  | {
      ok: false;
      rows: [];
      httpStatus: number;
      errorClass: JeProviderErrorClass;
      intuitTid: string | null;
      reason: string;
    };

/**
 * Bounded candidate discovery:
 * query JournalEntries by TxnDate window → inspect PrivateNote client-side
 * → exact correlation marker → economic verification.
 *
 * Never picks first match. MULTIPLE fails closed.
 * Query/read failure → INDETERMINATE (never NONE).
 */
export async function findJournalEntryByCorrelationMarker(args: {
  auth: QboReadAuth;
  correlationMarker: string;
  txnDate: string;
  /** Days before/after txnDate to query (default 0 = exact date). */
  dateWindowDays?: number;
  expected: DiscoveryExpectedEconomics;
  /**
   * Optional injectable query for unit tests. Production uses QBO query API.
   * Must return structured ok/fail — never silently empty on failure.
   */
  queryCandidates?: (args: {
    auth: QboReadAuth;
    startDate: string;
    endDate: string;
  }) => Promise<QueryJournalEntriesResult>;
}): Promise<FindJournalEntryByCorrelationResult> {
  const marker = String(args.correlationMarker || "").trim();
  const txnDate = String(args.txnDate || "").slice(0, 10);
  if (!marker || !txnDate) {
    return {
      kind: "INDETERMINATE",
      matches: [],
      candidateCount: 0,
      reason: "missing_marker_or_txn_date",
      errorClass: "PRE_SEND_FAILURE",
    };
  }

  const windowDays = Math.max(0, Number(args.dateWindowDays ?? 0));
  const start = shiftIsoDate(txnDate, -windowDays);
  const end = shiftIsoDate(txnDate, windowDays);

  let queryResult: QueryJournalEntriesResult;
  try {
    queryResult = args.queryCandidates
      ? await args.queryCandidates({
          auth: args.auth,
          startDate: start,
          endDate: end,
        })
      : await queryJournalEntriesByTxnDateWindow({
          auth: args.auth,
          startDate: start,
          endDate: end,
        });
  } catch (err) {
    return {
      kind: "INDETERMINATE",
      matches: [],
      candidateCount: 0,
      reason:
        err instanceof Error
          ? `query_exception:${err.message}`
          : "query_exception",
      errorClass: "NETWORK_UNCERTAIN",
      httpStatus: 0,
    };
  }

  if (!queryResult.ok) {
    return {
      kind: "INDETERMINATE",
      matches: [],
      candidateCount: 0,
      reason: queryResult.reason,
      httpStatus: queryResult.httpStatus,
      errorClass: queryResult.errorClass,
      intuitTid: queryResult.intuitTid,
    };
  }

  const candidates = queryResult.rows;
  const markerHits: NormalizedProviderJe[] = [];
  for (const raw of candidates) {
    const normalized = normalizeQboJournalEntry(raw);
    if (
      privateNoteContainsCorrelationMarker(normalized.privateNote, marker)
    ) {
      markerHits.push(normalized);
    }
  }

  const economicMatches = markerHits.filter((c) =>
    providerJeMatchesExpectedEconomics({
      candidate: c,
      expected: args.expected,
    }),
  );

  if (economicMatches.length === 0) {
    return {
      kind: "NONE",
      matches: [],
      candidateCount: candidates.length,
      reason:
        markerHits.length > 0
          ? "marker_present_but_economic_mismatch"
          : candidates.length === 0
            ? "successful_empty_query"
            : "no_marker_match",
      httpStatus: queryResult.httpStatus,
      intuitTid: queryResult.intuitTid,
    };
  }

  if (economicMatches.length === 1) {
    return {
      kind: "EXACT_ONE",
      matches: economicMatches,
      candidateCount: candidates.length,
      reason: "exact_marker_and_economics",
      httpStatus: queryResult.httpStatus,
      intuitTid: queryResult.intuitTid,
    };
  }

  return {
    kind: "MULTIPLE",
    matches: economicMatches,
    candidateCount: candidates.length,
    reason: "multiple_marker_and_economic_matches",
    httpStatus: queryResult.httpStatus,
    intuitTid: queryResult.intuitTid,
  };
}

/**
 * Structured QBO JournalEntry date-window query.
 * !ok / thrown fetch → ok:false (never empty rows as success).
 */
export async function queryJournalEntriesByTxnDateWindow(args: {
  auth: QboReadAuth;
  startDate: string;
  endDate: string;
}): Promise<QueryJournalEntriesResult> {
  // QBO query: PrivateNote is not reliably filterable — date window only.
  const query =
    args.startDate === args.endDate
      ? `select * from JournalEntry where TxnDate = '${args.startDate}'`
      : `select * from JournalEntry where TxnDate >= '${args.startDate}' and TxnDate <= '${args.endDate}'`;
  const url = `${qboApiBase()}/v3/company/${args.auth.realmId}/query?query=${encodeURIComponent(query)}&minorversion=73`;
  try {
    const { ok, status, json, intuit_tid } = await qboApiFetch(url, {
      accessToken: args.auth.accessToken,
      method: "GET",
      context: args.auth.userId
        ? { userId: args.auth.userId, realmId: args.auth.realmId }
        : undefined,
    });
    if (!ok) {
      return {
        ok: false,
        rows: [],
        httpStatus: status,
        errorClass: classifyReadHttpError(status),
        intuitTid: intuit_tid ?? null,
        reason: `http_${status}`,
      };
    }
    const rows = json?.QueryResponse?.JournalEntry;
    if (!rows) {
      // Successful query with zero JournalEntry entities.
      return {
        ok: true,
        rows: [],
        httpStatus: status,
        intuitTid: intuit_tid ?? null,
      };
    }
    return {
      ok: true,
      rows: Array.isArray(rows) ? rows : [rows],
      httpStatus: status,
      intuitTid: intuit_tid ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      rows: [],
      httpStatus: 0,
      errorClass: "NETWORK_UNCERTAIN",
      intuitTid: null,
      reason:
        err instanceof Error
          ? `query_exception:${err.message}`
          : "query_exception",
    };
  }
}

function shiftIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Crash-window recovery contract (documentation + pure helpers).
 */
export const JE_CRASH_RECOVERY_CONTRACT = {
  caseA:
    "POSTING committed locally; provider request never called → recovery may prove NOT_SENT.",
  caseB:
    "Provider request called; process dies before response persistence → UNKNOWN_COMMIT / discovery required.",
  caseC:
    "Provider returned ID; process dies before local save → discovery recovers marker/provider JE; never re-POST.",
  caseD:
    "Local provider ID saved but receipt publish fails → transaction rollback may lose local response; discovery required; never re-POST.",
} as const;

/**
 * DISCOVERED_NOT_FOUND may only follow successful NONE when custody already
 * proves the create request was never sent / definitely not committed.
 */
export function mayRecordDiscoveredNotFound(args: {
  discoveryKind: JeDiscoveryResultKind;
  commitCertainty: string;
}): boolean {
  if (args.discoveryKind !== "NONE") return false;
  return (
    args.commitCertainty === "NOT_SENT" ||
    args.commitCertainty === "DEFINITELY_NOT_COMMITTED"
  );
}
