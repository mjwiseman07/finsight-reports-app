/**
 * JE-3B2 — Governed QBO JournalEntry create transport.
 * Exactly one POST /journalentry. No internal retry. No legacy poster.
 * No Memory. No connection rebinding. Token is caller-supplied for the
 * exact accounting_connection_id already resolved upstream.
 */

import { qboApiFetch } from "@/lib/qbo/api-fetch.js";
import { sha256Hex, stableCanonicalJson } from "@/lib/audit-ready/measurement-snapshots/hash";
import type { JeQboJournalEntryWireBody } from "./provider-qbo-create-wire";
import { assertJe3b2LivePostNotEnabled, isJe3b2GovernedCreateEnabled } from "./je3b2-feature-gate";

function qboApiBase(): string {
  return (
    process.env.QBO_API_BASE ||
    process.env.QUICKBOOKS_API_BASE ||
    "https://quickbooks.api.intuit.com"
  ).replace(/\/$/, "");
}

export type GovernedQboCreateTransportResult = {
  requestStarted: true;
  responseReceived: boolean;
  httpStatus: number | null;
  intuitTid: string | null;
  providerId: string | null;
  providerResponseHash: string | null;
  rawJson: unknown;
  networkError: boolean;
  errorMessage: string | null;
  /** Always 1 for this transport — enforced. */
  postAttempts: 1;
};

export type GovernedQboCreateTransportDeps = {
  fetchFn?: typeof qboApiFetch;
  /** Test-only: allow a single POST when feature gate is still off. */
  allowTransportInTests?: boolean;
};

/**
 * Perform exactly one governed JournalEntry create POST.
 * Callers must already have committed provider_dispatch_started.
 */
export async function postGovernedQboJournalEntryOnce(args: {
  accountingConnectionId: string;
  realmId: string;
  accessToken: string;
  wireBody: JeQboJournalEntryWireBody;
  deps?: GovernedQboCreateTransportDeps;
}): Promise<GovernedQboCreateTransportResult> {
  if (!args.accountingConnectionId) {
    throw new Error("accountingConnectionId is required");
  }
  if (!args.realmId) {
    throw new Error("realmId is required");
  }
  if (!args.accessToken) {
    throw new Error("accessToken is required");
  }

  // Production/runtime gate: refuse live POST while JE-3B2 is hard-disabled.
  // Unit tests may pass allowTransportInTests with a mocked fetchFn only.
  if (!isJe3b2GovernedCreateEnabled()) {
    if (!args.deps?.allowTransportInTests || !args.deps.fetchFn) {
      assertJe3b2LivePostNotEnabled();
    }
  }

  const fetchFn = args.deps?.fetchFn || qboApiFetch;
  const url = `${qboApiBase()}/v3/company/${encodeURIComponent(args.realmId)}/journalentry?minorversion=73`;

  try {
    const { ok, status, json, intuit_tid, text } = await fetchFn(url, {
      accessToken: args.accessToken,
      method: "POST",
      body: args.wireBody as unknown as object,
      throwOnError: false,
      context: { realmId: args.realmId },
    });

    const providerId =
      json &&
      typeof json === "object" &&
      (json as { JournalEntry?: { Id?: unknown } }).JournalEntry?.Id != null
        ? String((json as { JournalEntry: { Id: unknown } }).JournalEntry.Id)
        : null;

    const responseText =
      typeof text === "string" && text.length > 0
        ? text
        : JSON.stringify(json ?? null);
    const providerResponseHash = sha256Hex(
      stableCanonicalJson({
        httpStatus: status,
        body: json ?? null,
      }),
    );

    return {
      requestStarted: true,
      responseReceived: true,
      httpStatus: Number(status) || null,
      intuitTid: intuit_tid ? String(intuit_tid) : null,
      providerId,
      providerResponseHash,
      rawJson: json,
      networkError: false,
      errorMessage: ok
        ? null
        : `HTTP ${status}${responseText ? `: ${responseText.slice(0, 240)}` : ""}`,
      postAttempts: 1,
    };
  } catch (err) {
    return {
      requestStarted: true,
      responseReceived: false,
      httpStatus: null,
      intuitTid: null,
      providerId: null,
      providerResponseHash: null,
      rawJson: null,
      networkError: true,
      errorMessage: err instanceof Error ? err.message : String(err),
      postAttempts: 1,
    };
  }
}
