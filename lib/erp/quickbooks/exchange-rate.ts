/**
 * Phase MC-3 — QBO ExchangeRate fetcher (Issue #6, Gap X-1).
 *
 * Fetches the ExchangeRate from QBO for (source currency, as-of date).
 * Home-currency short-circuits to 1.0 without any network call.
 *
 * Retries: 3 attempts on 429/5xx transient faults; matches the retry idiom
 * already blessed in je-validator.ts::accountExists.
 *
 * QBO endpoint contract (per Intuit docs):
 *   GET /v3/company/<realmId>/exchangerate
 *       ?sourcecurrencycode=<code>[&asofdate=<yyyy-mm-dd>]
 *   Response: { ExchangeRate: { Rate: 1.3245, AsOfDate: 'yyyy-mm-dd', ... } }
 *
 * Never throws; returns { ok: false, reason } for the poster to finalize.
 */
import { qboApiFetch } from "../../qbo/api-fetch.js";

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export type ExchangeRateResult =
  | { ok: true; rate: number; as_of_date: string }
  | { ok: false; reason: "exchange_rate_unavailable"; details?: unknown };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function resolveExchangeRate(
  realmId: string,
  accessToken: string,
  sourceCurrency: string,
  homeCurrency: string,
  asOfDate: string,
  userId?: string,
): Promise<ExchangeRateResult> {
  if (sourceCurrency.toUpperCase() === homeCurrency.toUpperCase()) {
    return { ok: true, rate: 1, as_of_date: asOfDate };
  }

  const maxAttempts = 3;
  const src = encodeURIComponent(sourceCurrency);
  const asOf = encodeURIComponent(asOfDate);
  const url =
    `${qboApiBase()}/v3/company/${realmId}/exchangerate` +
    `?sourcecurrencycode=${src}&asofdate=${asOf}&minorversion=73`;

  let lastDetail: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { ok, status, json } = await qboApiFetch(url, {
      accessToken,
      method: "GET",
      context: userId ? { userId, realmId } : undefined,
    });

    if (ok) {
      const rate = Number(json?.ExchangeRate?.Rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        return {
          ok: false,
          reason: "exchange_rate_unavailable",
          details: { json, note: "response_missing_or_invalid_rate" },
        };
      }
      const stampedAsOf = String(
        json?.ExchangeRate?.AsOfDate || asOfDate,
      ).slice(0, 10);
      return { ok: true, rate, as_of_date: stampedAsOf };
    }

    lastDetail = { status, json };
    const transient = status === 429 || status >= 500;
    if (!transient || attempt === maxAttempts) break;
    await sleep(800 * attempt);
  }

  return {
    ok: false,
    reason: "exchange_rate_unavailable",
    details: lastDetail,
  };
}
