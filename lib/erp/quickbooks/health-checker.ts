/**
 * QBO Health Checker (Doc D1).
 *
 * Performs a live, read-only probe against QBO for a firm_client: confirms the
 * token resolves, the required scope is present, and the realm is reachable via
 * the companyinfo endpoint. Records the result to qbo_health_check_log and
 * updates firm_clients.qbo_last_health_check_*.
 *
 * Read-only. No QBO writes.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  resolveQBOTokenForFirmClient,
  refreshQBOToken,
  type QBOTokenBundle,
  type QBOTokenSource,
} from "@/lib/erp/quickbooks/token-resolver";

export type QBOHealthStatus =
  | "healthy"
  | "token_expired"
  | "refresh_failed"
  | "realm_invalid"
  | "scope_missing"
  | "unknown_error";

export interface QBOHealthResult {
  status: QBOHealthStatus;
  tokenSource: QBOTokenSource | "none";
  realmId?: string;
  grantedScopes?: string[];
  latencyMs: number;
  errorMessage?: string;
}

const QBO_SCOPE = "com.intuit.quickbooks.accounting";

function qboBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

async function companyInfoStatus(bundle: QBOTokenBundle): Promise<number> {
  const url = `${qboBaseUrl()}/v3/company/${bundle.realmId}/companyinfo/${bundle.realmId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${bundle.accessToken}`,
      Accept: "application/json",
    },
  });
  return response.status;
}

function statusFromHttp(httpStatus: number): QBOHealthStatus {
  if (httpStatus === 200) return "healthy";
  if (httpStatus === 401) return "token_expired";
  if (httpStatus === 400 || httpStatus === 404) return "realm_invalid";
  return "unknown_error";
}

async function persist(
  firmClientId: string,
  result: QBOHealthResult,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  await supabase.from("qbo_health_check_log").insert({
    firm_client_id: firmClientId,
    check_status: result.status,
    token_source: result.tokenSource,
    realm_id: result.realmId ?? null,
    granted_scopes: result.grantedScopes ?? null,
    error_message: result.errorMessage ?? null,
    latency_ms: result.latencyMs,
    checked_at: nowIso,
  });

  await supabase
    .from("firm_clients")
    .update({
      qbo_last_health_check_at: nowIso,
      qbo_last_health_check_status: result.status,
    })
    .eq("id", firmClientId);
}

/**
 * Runs a full health check and records the outcome. Always writes an audit row
 * (except when logging itself throws, which is swallowed to preserve the result).
 */
export async function checkQBOHealth(firmClientId: string): Promise<QBOHealthResult> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const startedAt = Date.now();

  const finalize = async (partial: Omit<QBOHealthResult, "latencyMs">): Promise<QBOHealthResult> => {
    const result: QBOHealthResult = { ...partial, latencyMs: Date.now() - startedAt };
    try {
      await persist(firmClientId, result);
    } catch (err) {
      // Do not let audit persistence failure mask the health result.
      console.warn("[qbo/health] failed to persist health check", {
        firmClientId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return result;
  };

  let bundle: QBOTokenBundle | null;
  try {
    bundle = await resolveQBOTokenForFirmClient(firmClientId);
  } catch (err) {
    return finalize({
      status: "unknown_error",
      tokenSource: "none",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }

  if (!bundle) {
    return finalize({
      status: "scope_missing",
      tokenSource: "none",
      errorMessage: "No QBO connection found for firm_client",
    });
  }

  if (!bundle.realmId) {
    return finalize({
      status: "realm_invalid",
      tokenSource: bundle.tokenSource,
      grantedScopes: bundle.grantedScopes,
      errorMessage: "Connection has no realm_id",
    });
  }

  if (!bundle.grantedScopes.includes(QBO_SCOPE)) {
    return finalize({
      status: "scope_missing",
      tokenSource: bundle.tokenSource,
      realmId: bundle.realmId,
      grantedScopes: bundle.grantedScopes,
      errorMessage: `Missing required scope ${QBO_SCOPE}`,
    });
  }

  try {
    let httpStatus = await companyInfoStatus(bundle);

    // On 401, attempt a single forced refresh, then re-probe.
    if (httpStatus === 401) {
      try {
        const refreshed = await refreshQBOToken(firmClientId, bundle.tokenSource);
        if (!refreshed) {
          return finalize({
            status: "refresh_failed",
            tokenSource: bundle.tokenSource,
            realmId: bundle.realmId,
            grantedScopes: bundle.grantedScopes,
            errorMessage: "Refresh returned no connection",
          });
        }
        bundle = refreshed;
        httpStatus = await companyInfoStatus(bundle);
        if (httpStatus === 401) {
          return finalize({
            status: "refresh_failed",
            tokenSource: bundle.tokenSource,
            realmId: bundle.realmId,
            grantedScopes: bundle.grantedScopes,
            errorMessage: "Still 401 after refresh",
          });
        }
      } catch (err) {
        return finalize({
          status: "refresh_failed",
          tokenSource: bundle.tokenSource,
          realmId: bundle.realmId,
          grantedScopes: bundle.grantedScopes,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return finalize({
      status: statusFromHttp(httpStatus),
      tokenSource: bundle.tokenSource,
      realmId: bundle.realmId,
      grantedScopes: bundle.grantedScopes,
      errorMessage: httpStatus === 200 ? undefined : `QBO companyinfo returned ${httpStatus}`,
    });
  } catch (err) {
    return finalize({
      status: "unknown_error",
      tokenSource: bundle.tokenSource,
      realmId: bundle.realmId,
      grantedScopes: bundle.grantedScopes,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}
