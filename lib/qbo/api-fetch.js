// lib/qbo/api-fetch.js
//
// Central QBO API fetch wrapper. All calls to *.api.intuit.com MUST go through
// this helper so we uniformly capture the `intuit_tid` response header. Intuit
// support requires the TID to trace any failing request; without it we cannot
// open a support ticket.
//
// Also injects the QuotaGuard undici dispatcher (matches existing convention
// across quickbooks-adapter.js / qbo-rest.js / health-checker.ts).
//
// Usage:
//   const { ok, status, json, text, intuit_tid } = await qboApiFetch(url, {
//     method: "GET",
//     accessToken,
//   });
//   if (!ok) throw new QboApiError(...); // helper throws automatically if throwOnError=true
//
// The wrapper returns a shaped result rather than the raw Response so callers
// don't have to remember to read headers before consuming the body.

import { getQuotaGuardUndiciDispatcher } from "../network/quotaguard-proxy";
import { persistRecentIntuitTid } from "./recent-intuit-tid";

/**
 * Extract the intuit_tid header, tolerating case + hyphen/underscore variants.
 * Intuit's docs show `intuit_tid`, but some responses use `intuit-tid`.
 */
function extractIntuitTid(headers) {
  if (!headers || typeof headers.get !== "function") return null;
  return (
    headers.get("intuit_tid") ||
    headers.get("intuit-tid") ||
    headers.get("Intuit_Tid") ||
    headers.get("Intuit-Tid") ||
    null
  );
}

export class QboApiError extends Error {
  constructor({ message, status, intuit_tid, url, payload }) {
    super(message);
    this.name = "QboApiError";
    this.status = status;
    this.intuit_tid = intuit_tid;
    this.url = url;
    this.payload = payload;
  }
}

/**
 * @param {string} url — full QBO API URL
 * @param {object} options
 * @param {string} options.accessToken — OAuth bearer token
 * @param {"GET"|"POST"|"PUT"|"DELETE"} [options.method="GET"]
 * @param {object|string} [options.body] — for POST/PUT (JSON-stringified if object)
 * @param {object} [options.extraHeaders]
 * @param {boolean} [options.throwOnError=false] — throw QboApiError on non-2xx
 * @param {object} [options.context] — optional per-request context for tid capture
 * @param {string} [options.context.userId] — supabase user id
 * @param {string} [options.context.realmId] — QBO realm id
 * @returns {Promise<{ok:boolean,status:number,intuit_tid:string|null,text:string,json:any,url:string,elapsed_ms:number}>}
 */
export async function qboApiFetch(url, options) {
  const {
    accessToken,
    method = "GET",
    body,
    extraHeaders = {},
    throwOnError = false,
  } = options || {};

  if (!accessToken) throw new Error("qboApiFetch: accessToken is required");

  const dispatcher = getQuotaGuardUndiciDispatcher();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
    ...(body && typeof body !== "string"
      ? { "Content-Type": "application/json" }
      : {}),
    ...extraHeaders,
  };

  // Strip query string + realm ID from url for log line — avoid leaking secrets
  // or bloating logs, but keep enough to identify the endpoint.
  const urlObj = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  const url_path = urlObj ? urlObj.pathname : url.slice(0, 120);

  const started = Date.now();
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined
        ? { body: typeof body === "string" ? body : JSON.stringify(body) }
        : {}),
      ...(dispatcher ? { dispatcher } : {}),
    });
  } catch (networkErr) {
    const elapsed_ms = Date.now() - started;
    console.error("[qbo-api] network error", {
      method,
      url_path,
      elapsed_ms,
      err: networkErr?.message,
    });
    if (throwOnError) {
      throw new QboApiError({
        message: `QBO API network error: ${networkErr?.message || "unknown"}`,
        status: 0,
        intuit_tid: null,
        url,
        payload: null,
      });
    }
    throw networkErr;
  }

  const elapsed_ms = Date.now() - started;
  const intuit_tid = extractIntuitTid(response.headers);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  const logLine = {
    method,
    url_path,
    status: response.status,
    intuit_tid,
    elapsed_ms,
  };
  if (response.ok) {
    console.log("[qbo-api] ok", logLine);
  } else {
    console.warn("[qbo-api] non-2xx", {
      ...logLine,
      qbo_fault: json?.Fault?.Error?.[0]?.Message || json?.error || null,
    });
  }

  if (intuit_tid && options?.context?.userId && options?.context?.realmId) {
    // Fire and forget — never block the caller, never throw
    void persistRecentIntuitTid({
      userId: options.context.userId,
      realmId: options.context.realmId,
      intuit_tid,
      endpoint: url_path,
      status_code: response.status,
    }).catch(() => {});
  }

  const result = {
    ok: response.ok,
    status: response.status,
    intuit_tid,
    text,
    json,
    url,
    elapsed_ms,
  };

  if (!response.ok && throwOnError) {
    throw new QboApiError({
      message:
        json?.Fault?.Error?.[0]?.Message ||
        json?.error ||
        `QuickBooks API request failed (${response.status})`,
      status: response.status,
      intuit_tid,
      url,
      payload: json,
    });
  }

  return result;
}
