/**
 * JE-3B1 — Provider-attempt types + commit-certainty / error classification.
 * Network-level CREATE attempt custody. Not domain execution authority.
 */

export const JE_PROVIDER_ATTEMPT_STATUSES = [
  "RESERVED",
  "REQUEST_STARTED",
  "RESPONSE_RECEIVED",
  "UNKNOWN_RESULT",
  "FAILED_PRECOMMIT",
  "DISCOVERED_COMMITTED",
  "DISCOVERED_NOT_FOUND",
  "VERIFIED_PROVIDER_ID",
] as const;

export type JeProviderAttemptStatus =
  (typeof JE_PROVIDER_ATTEMPT_STATUSES)[number];

export const JE_COMMIT_CERTAINTIES = [
  "NOT_SENT",
  "DEFINITELY_NOT_COMMITTED",
  "POSSIBLY_COMMITTED",
  "COMMITTED",
] as const;

export type JeCommitCertainty = (typeof JE_COMMIT_CERTAINTIES)[number];

export const JE_PROVIDER_ERROR_CLASSES = [
  "PRE_SEND_FAILURE",
  "DEFINITE_PROVIDER_REJECTION",
  "AUTH_REJECTED",
  "RATE_LIMITED",
  "SERVER_ERROR",
  "NETWORK_UNCERTAIN",
  "MALFORMED_SUCCESS",
  "SUCCESS_WITH_ID",
] as const;

export type JeProviderErrorClass = (typeof JE_PROVIDER_ERROR_CLASSES)[number];

export const JE_DISCOVERY_RESULTS = [
  "NONE",
  "EXACT_ONE",
  "MULTIPLE",
  "INDETERMINATE",
] as const;
export type JeDiscoveryResultKind = (typeof JE_DISCOVERY_RESULTS)[number];

/** Per-JE read-by-id outcomes — never conflate failure with NOT_FOUND. */
export const JE_READ_BY_ID_OUTCOMES = [
  "FOUND",
  "NOT_FOUND",
  "READ_FAILED",
] as const;
export type JeReadByIdOutcome = (typeof JE_READ_BY_ID_OUTCOMES)[number];

export type JournalEntryProviderAttemptRow = {
  id: string;
  execution_id: string;
  accounting_connection_id: string;
  provider: "quickbooks";
  provider_request_hash: string;
  correlation_marker: string;
  status: JeProviderAttemptStatus;
  commit_certainty: JeCommitCertainty;
  request_started_at: string | null;
  request_completed_at: string | null;
  qbo_je_id: string | null;
  intuit_tid: string | null;
  provider_response_hash: string | null;
  provider_error_code: string | null;
  provider_error_message: string | null;
  discovery_summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * Explicit network-boundary result for a future governed POST adapter.
 * Thrown fetch errors are insufficient — transmission certainty must be stated.
 */
export type JeProviderNetworkAttemptResult = {
  requestStarted: boolean;
  responseReceived: boolean;
  providerId?: string;
  intuitTid?: string;
  httpStatus?: number;
  errorClass: JeProviderErrorClass;
  commitCertainty: JeCommitCertainty;
  providerResponseHash?: string;
  errorMessage?: string;
};

export const JE_PROVIDER_ATTEMPT_ERROR = {
  CONNECTION_MISMATCH: "je_provider_attempt_connection_mismatch",
  REQUEST_HASH_MISMATCH: "je_provider_attempt_request_hash_mismatch",
  CORRELATION_MISMATCH: "je_provider_attempt_correlation_mismatch",
  BINDING_CONFLICT: "je_provider_attempt_binding_conflict",
  CALLER_REALM_FORBIDDEN: "je_provider_attempt_caller_realm_forbidden",
  EXECUTION_STATUS_INVALID: "je_provider_attempt_execution_status_invalid",
  CONNECTION_UNUSABLE: "je_provider_attempt_connection_unusable",
  RECOVERY_UNAUTHORIZED: "je_provider_attempt_recovery_unauthorized",
  /** Alias message path; production returns JE_EXECUTION_ERROR.WRITE_FORBIDDEN. */
  WRITE_FORBIDDEN: "je_provider_attempt_write_forbidden",
  DISCOVERY_MULTIPLE: "je_provider_attempt_discovery_multiple",
  NO_GOVERNED_POST: "je_provider_attempt_no_governed_post",
} as const;

/**
 * Classify a future provider create outcome conservatively.
 * Used by recovery/tests; no live POST in JE-3B1.
 */
export function classifyJeProviderCreateOutcome(args: {
  requestStarted: boolean;
  responseReceived: boolean;
  httpStatus?: number | null;
  providerId?: string | null;
  networkError?: boolean;
}): JeProviderNetworkAttemptResult {
  if (!args.requestStarted) {
    return {
      requestStarted: false,
      responseReceived: false,
      errorClass: "PRE_SEND_FAILURE",
      commitCertainty: "DEFINITELY_NOT_COMMITTED",
      errorMessage: "Request never left the process.",
    };
  }

  if (args.networkError || !args.responseReceived) {
    return {
      requestStarted: true,
      responseReceived: false,
      errorClass: "NETWORK_UNCERTAIN",
      commitCertainty: "POSSIBLY_COMMITTED",
      errorMessage:
        "Request may have left the process; commit outcome uncertain.",
    };
  }

  const status = Number(args.httpStatus || 0);

  if (status === 401) {
    // Definitive HTTP 401 with a received response: treat as auth rejection.
    // Blind 401→retry is NOT authorized for governed create; classification only.
    return {
      requestStarted: true,
      responseReceived: true,
      httpStatus: 401,
      errorClass: "AUTH_REJECTED",
      commitCertainty: "DEFINITELY_NOT_COMMITTED",
      errorMessage:
        "Definitive HTTP 401 received. Governed path must not blind-retry; refresh+retry is a separate explicit policy decision.",
    };
  }

  if (status === 429) {
    return {
      requestStarted: true,
      responseReceived: true,
      httpStatus: 429,
      errorClass: "RATE_LIMITED",
      // Explicit rejection response → treat as non-commit unless proven otherwise.
      commitCertainty: "DEFINITELY_NOT_COMMITTED",
      errorMessage: "HTTP 429 rate limit with definitive response body.",
    };
  }

  if (status >= 400 && status < 500) {
    return {
      requestStarted: true,
      responseReceived: true,
      httpStatus: status,
      errorClass: "DEFINITE_PROVIDER_REJECTION",
      commitCertainty: "DEFINITELY_NOT_COMMITTED",
      errorMessage: `HTTP ${status} client rejection.`,
    };
  }

  if (status >= 500) {
    return {
      requestStarted: true,
      responseReceived: true,
      httpStatus: status,
      errorClass: "SERVER_ERROR",
      // Fail-safe: 5xx after request left → possibly committed unless docs prove otherwise.
      commitCertainty: "POSSIBLY_COMMITTED",
      errorMessage: `HTTP ${status} server error; commit certainty unknown.`,
    };
  }

  if (status >= 200 && status < 300) {
    const providerId = args.providerId ? String(args.providerId) : "";
    if (!providerId) {
      return {
        requestStarted: true,
        responseReceived: true,
        httpStatus: status,
        errorClass: "MALFORMED_SUCCESS",
        commitCertainty: "POSSIBLY_COMMITTED",
        errorMessage: "Success-class response without provider JE id.",
      };
    }
    return {
      requestStarted: true,
      responseReceived: true,
      httpStatus: status,
      providerId,
      errorClass: "SUCCESS_WITH_ID",
      commitCertainty: "COMMITTED",
    };
  }

  return {
    requestStarted: true,
    responseReceived: true,
    httpStatus: status || undefined,
    errorClass: "NETWORK_UNCERTAIN",
    commitCertainty: "POSSIBLY_COMMITTED",
    errorMessage: "Unrecognized outcome; treat as possibly committed.",
  };
}

/**
 * DocNumber recommendation for governed QBO JournalEntry create.
 * PrivateNote correlation marker remains required regardless.
 */
export const JE_DOCNUMBER_RECOMMENDATION = {
  forceDocNumber: false as const,
  reason:
    "Do not force DocNumber on governed JournalEntry create. QBO auto-numbering and customer sequence workflows can conflict; JournalEntry DocNumber behavior is inconsistent across realms. Prefer PrivateNote ADVJE marker for correlation; optional deterministic DocNumber (ADVJE-<short hash>) may be revisited as an additive ops-approved enhancement.",
  privateNoteMarkerRequired: true as const,
} as const;
