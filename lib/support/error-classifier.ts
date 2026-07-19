import { ERROR_CLASS, type ErrorClass } from "./error-taxonomy";

export interface ClassifyInput {
  source: "qbo" | "cdc" | "internal" | "bedrock" | "stripe";
  httpStatus?: number;
  method?: string;
  qboFaultCode?: string | null;
  qboFaultMessage?: string | null;
  errorMessage?: string | null;
  errorName?: string | null;
}

export function classifyError(input: ClassifyInput): ErrorClass {
  const s = input.source;
  const status = input.httpStatus ?? 0;
  const method = (input.method || "GET").toUpperCase();
  const fmsg = input.qboFaultMessage || "";
  const emsg = input.errorMessage || "";
  const ename = input.errorName || "";

  if (s === "qbo") {
    if (status === 401) return ERROR_CLASS.QBO_AUTH_TOKEN_EXPIRED;
    if (status === 403 && /scope|permission/i.test(fmsg)) return ERROR_CLASS.QBO_AUTH_SCOPE_INSUFFICIENT;
    if (status === 403) return ERROR_CLASS.QBO_AUTH_DISCONNECTED;
    if (status === 429) return ERROR_CLASS.QBO_RATE_LIMIT;
    if (status === 400 && /readonly|read-only|subscription/i.test(fmsg)) {
      return ERROR_CLASS.QBO_WRITE_READONLY_SUBSCRIPTION;
    }
    if (status === 400 && (method === "POST" || method === "PUT")) return ERROR_CLASS.QBO_WRITE_VALIDATION;
    if (status === 400) return ERROR_CLASS.QBO_READ_VALIDATION;
    if (status === 409) return ERROR_CLASS.QBO_WRITE_CONCURRENCY;
    if (status >= 500) return ERROR_CLASS.QBO_UNAVAILABLE;
    return ERROR_CLASS.UNKNOWN;
  }

  if (s === "cdc") {
    if (/stall|no progress/i.test(emsg)) return ERROR_CLASS.CDC_STALLED;
    return ERROR_CLASS.CDC_FAILED;
  }

  if (s === "internal") {
    if (ename === "PostgrestError" || /postgres|supabase/i.test(emsg)) return ERROR_CLASS.INTERNAL_DB_ERROR;
    if (/timeout|ETIMEDOUT|aborted/i.test(emsg)) return ERROR_CLASS.INTERNAL_TIMEOUT;
    return ERROR_CLASS.INTERNAL_UNCAUGHT;
  }

  if (s === "bedrock") return ERROR_CLASS.BEDROCK_UNAVAILABLE;
  if (s === "stripe") return ERROR_CLASS.STRIPE_ERROR;

  return ERROR_CLASS.UNKNOWN;
}

export function normalizeEndpoint(rawUrl?: string | null): string {
  if (!rawUrl) return "/";
  let path = rawUrl;
  try {
    const asUrl = new URL(rawUrl, "https://x.local");
    path = asUrl.pathname;
  } catch {
    // path already relative
    const q = rawUrl.indexOf("?");
    if (q >= 0) path = rawUrl.slice(0, q);
  }
  // Collapse QBO realm segment: /v3/company/1234567890/xyz -> /v3/company/:realm/xyz
  path = path.replace(/\/v3\/company\/\d+/i, "/v3/company/:realm");
  // Collapse UUIDs
  path = path.replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, "/:uuid");
  // Collapse numeric ids
  path = path.replace(/\/\d{2,}/g, "/:id");
  return path || "/";
}
