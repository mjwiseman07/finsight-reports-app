/**
 * JE-3B1 — Read-only QBO JournalEntry adapters + correlation discovery.
 * Safe GET/query only. Never POST. Never call the legacy journal-entry poster.
 *
 * PrivateNote is NOT assumed queryable via QBO query language.
 * Discovery: bounded TxnDate window → client-side PrivateNote match → economics.
 */

import { qboApiFetch } from "@/lib/qbo/api-fetch.js";
import {
  hashNormalizedProviderJe,
  normalizeQboJournalEntry,
  privateNoteContainsCorrelationMarker,
  providerJeMatchesExpectedEconomics,
  type NormalizedProviderJe,
} from "./provider-je-normalize";
import type { JeDiscoveryResultKind } from "./provider-attempt-types";

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

export type ReadJournalEntryByIdResult = {
  found: boolean;
  normalized: NormalizedProviderJe | null;
  providerResponseHash: string | null;
  intuitTid: string | null;
  httpStatus: number;
};

export async function readJournalEntryById(args: {
  auth: QboReadAuth;
  qboJeId: string;
}): Promise<ReadJournalEntryByIdResult> {
  const id = String(args.qboJeId || "").trim();
  if (!id) {
    return {
      found: false,
      normalized: null,
      providerResponseHash: null,
      intuitTid: null,
      httpStatus: 0,
    };
  }
  const url = `${qboApiBase()}/v3/company/${args.auth.realmId}/journalentry/${encodeURIComponent(id)}?minorversion=73`;
  const { ok, status, json, intuit_tid } = await qboApiFetch(url, {
    accessToken: args.auth.accessToken,
    method: "GET",
    context: args.auth.userId
      ? { userId: args.auth.userId, realmId: args.auth.realmId }
      : undefined,
  });
  if (!ok || status === 404) {
    return {
      found: false,
      normalized: null,
      providerResponseHash: null,
      intuitTid: intuit_tid ?? null,
      httpStatus: status,
    };
  }
  const entity =
    (json?.JournalEntry as Record<string, unknown> | undefined) ||
    (json as Record<string, unknown>);
  if (!entity || !(entity.Id || entity.id)) {
    return {
      found: false,
      normalized: null,
      providerResponseHash: null,
      intuitTid: intuit_tid ?? null,
      httpStatus: status,
    };
  }
  const normalized = normalizeQboJournalEntry(entity);
  return {
    found: true,
    normalized,
    providerResponseHash: hashNormalizedProviderJe(normalized),
    intuitTid: intuit_tid ?? null,
    httpStatus: status,
  };
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
  /** Why MULTIPLE / NONE — for recovery metadata. */
  reason: string;
};

/**
 * Bounded candidate discovery:
 * query JournalEntries by TxnDate window → inspect PrivateNote client-side
 * → exact correlation marker → economic verification.
 *
 * Never picks first match. MULTIPLE fails closed.
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
   */
  queryCandidates?: (args: {
    auth: QboReadAuth;
    startDate: string;
    endDate: string;
  }) => Promise<Record<string, unknown>[]>;
}): Promise<FindJournalEntryByCorrelationResult> {
  const marker = String(args.correlationMarker || "").trim();
  const txnDate = String(args.txnDate || "").slice(0, 10);
  if (!marker || !txnDate) {
    return {
      kind: "NONE",
      matches: [],
      candidateCount: 0,
      reason: "missing_marker_or_txn_date",
    };
  }

  const windowDays = Math.max(0, Number(args.dateWindowDays ?? 0));
  const start = shiftIsoDate(txnDate, -windowDays);
  const end = shiftIsoDate(txnDate, windowDays);

  const candidates = args.queryCandidates
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
          : "no_marker_match",
    };
  }

  if (economicMatches.length === 1) {
    return {
      kind: "EXACT_ONE",
      matches: economicMatches,
      candidateCount: candidates.length,
      reason: "exact_marker_and_economics",
    };
  }

  return {
    kind: "MULTIPLE",
    matches: economicMatches,
    candidateCount: candidates.length,
    reason: "multiple_marker_and_economic_matches",
  };
}

async function queryJournalEntriesByTxnDateWindow(args: {
  auth: QboReadAuth;
  startDate: string;
  endDate: string;
}): Promise<Record<string, unknown>[]> {
  // QBO query: PrivateNote is not reliably filterable — date window only.
  const query =
    args.startDate === args.endDate
      ? `select * from JournalEntry where TxnDate = '${args.startDate}'`
      : `select * from JournalEntry where TxnDate >= '${args.startDate}' and TxnDate <= '${args.endDate}'`;
  const url = `${qboApiBase()}/v3/company/${args.auth.realmId}/query?query=${encodeURIComponent(query)}&minorversion=73`;
  const { ok, json } = await qboApiFetch(url, {
    accessToken: args.auth.accessToken,
    method: "GET",
    context: args.auth.userId
      ? { userId: args.auth.userId, realmId: args.auth.realmId }
      : undefined,
  });
  if (!ok) return [];
  const rows = json?.QueryResponse?.JournalEntry;
  if (!rows) return [];
  return Array.isArray(rows) ? rows : [rows];
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
