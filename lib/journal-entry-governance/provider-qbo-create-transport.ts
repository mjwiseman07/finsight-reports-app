/**
 * JE-3B2 — Governed QBO JournalEntry create transport.
 * Exactly one POST /journalentry. No internal retry. No legacy poster.
 * No Memory. No connection rebinding.
 *
 * Caller must supply apiBase + fetchFn. This module never defaults to the
 * production Intuit host or the live qboApiFetch client.
 */

import { sha256Hex, stableCanonicalJson } from "@/lib/audit-ready/measurement-snapshots/hash";
import type { JeQboJournalEntryWireBody } from "./provider-qbo-create-wire";

const SANDBOX_HOST = "https://sandbox-quickbooks.api.intuit.com";
const PRODUCTION_HOST = "https://quickbooks.api.intuit.com";

export type GovernedQboCreateFetchFn = (
  url: string,
  init: {
    accessToken: string;
    method: string;
    body: object;
    throwOnError: boolean;
    context: { realmId: string };
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: unknown;
  text?: string;
  intuit_tid?: string | null;
  url?: string;
  elapsed_ms?: number;
}>;

/**
 * Fail-closed host selection for governed writes.
 * Honors QB_ENVIRONMENT = sandbox | production only.
 * Missing or invalid values never fall through to production.
 */
export function resolveGovernedQboWriteApiBase(
  envValue: string | undefined = process.env.QB_ENVIRONMENT,
): string {
  const env = typeof envValue === "string" ? envValue.trim() : "";
  if (env === "production") return PRODUCTION_HOST;
  if (env === "sandbox") return SANDBOX_HOST;
  if (!env) {
    throw new Error(
      "QB_ENVIRONMENT is required for governed QBO write (sandbox|production).",
    );
  }
  throw new Error(
    `QB_ENVIRONMENT invalid for governed QBO write: ${env} (expected sandbox|production).`,
  );
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

/**
 * Perform exactly one governed JournalEntry create POST.
 * Callers must already have committed provider_dispatch_started.
 * apiBase and fetchFn are required — no silent production defaults.
 */
export async function postGovernedQboJournalEntryOnce(args: {
  accountingConnectionId: string;
  realmId: string;
  accessToken: string;
  wireBody: JeQboJournalEntryWireBody;
  apiBase: string;
  fetchFn: GovernedQboCreateFetchFn;
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
  if (!args.apiBase) {
    throw new Error("apiBase is required for governed QBO write");
  }
  if (typeof args.fetchFn !== "function") {
    throw new Error("fetchFn is required for governed QBO write");
  }

  const base = args.apiBase.replace(/\/$/, "");
  const url = `${base}/v3/company/${encodeURIComponent(args.realmId)}/journalentry?minorversion=73`;

  try {
    const { ok, status, json, intuit_tid, text } = await args.fetchFn(url, {
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
