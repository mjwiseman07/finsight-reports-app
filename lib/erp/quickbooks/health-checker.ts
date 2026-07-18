/**
 * QBO Health Checker (Doc D1 + Phase Q7 edition retrofit).
 *
 * Performs a live, read-only probe against QBO for a firm_client: confirms the
 * token resolves, the required scope is present, and the realm is reachable via
 * the companyinfo endpoint. Records the result to qbo_health_check_log and
 * updates firm_clients.qbo_last_health_check_*.
 *
 * On a healthy 200, also opportunistically backfills qbo_edition /
 * qbo_subscription_status on accounting_connections when those columns are NULL
 * (Phase Q7 / Issue #7).
 *
 * Read-only. No QBO writes.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { qboApiFetch } from "../../qbo/api-fetch.js";
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

type CompanyInfoPayload = {
  NameValue?: Array<{ Name?: string; Value?: string }>;
  SubscriptionStatus?: string;
};

const QBO_SCOPE = "com.intuit.quickbooks.accounting";

function qboBaseUrl(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

/**
 * Fetch CompanyInfo and return both HTTP status and the CompanyInfo object
 * (when status is 200). Used so Q7 can parse OfferingSku / SubscriptionStatus.
 */
async function fetchCompanyInfo(
  bundle: QBOTokenBundle,
): Promise<{ status: number; companyInfo: CompanyInfoPayload | null }> {
  const url = `${qboBaseUrl()}/v3/company/${bundle.realmId}/companyinfo/${bundle.realmId}`;
  const { status, json } = await qboApiFetch(url, {
    accessToken: bundle.accessToken,
    method: "GET",
  });
  if (status !== 200) {
    return { status, companyInfo: null };
  }
  const root = (json ?? {}) as { CompanyInfo?: CompanyInfoPayload } & CompanyInfoPayload;
  const companyInfo: CompanyInfoPayload =
    root.CompanyInfo && typeof root.CompanyInfo === "object" ? root.CompanyInfo : root;
  return { status, companyInfo };
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
 * Phase Q7 (Issue #7): opportunistic retrofit for older rows that pre-date
 * OAuth-time edition capture. Never overwrites a non-null value.
 */
async function retrofitEditionFromCompanyInfo(
  realmId: string,
  companyInfo: CompanyInfoPayload | null,
): Promise<void> {
  if (!companyInfo) return;
  try {
    const nameValues = Array.isArray(companyInfo.NameValue) ? companyInfo.NameValue : [];
    let offeringSkuRaw: string | null = null;
    for (const entry of nameValues) {
      if (entry?.Name === "OfferingSku" && typeof entry.Value === "string") {
        offeringSkuRaw = entry.Value;
        break;
      }
    }
    const subStatusRaw =
      typeof companyInfo.SubscriptionStatus === "string" ? companyInfo.SubscriptionStatus : null;

    const { parseOfferingSku, parseSubscriptionStatus } = await import(
      "@/lib/erp/quickbooks/qbo-editions"
    );
    const parsedEdition = parseOfferingSku(offeringSkuRaw);
    const parsedStatus = parseSubscriptionStatus(subStatusRaw);

    const supabase = getSupabaseAdmin();
    const { data: existingRow } = await supabase
      .from("accounting_connections")
      .select("id, qbo_edition, qbo_subscription_status")
      .eq("tenant_or_realm_id", realmId)
      .eq("provider", "quickbooks")
      .maybeSingle();

    if (existingRow?.id && (!existingRow.qbo_edition || !existingRow.qbo_subscription_status)) {
      await supabase
        .from("accounting_connections")
        .update({
          qbo_edition: existingRow.qbo_edition ?? parsedEdition,
          qbo_subscription_status: existingRow.qbo_subscription_status ?? parsedStatus,
        })
        .eq("id", existingRow.id);
    }
  } catch (retrofitErr) {
    console.warn("[qbo-health] Q7 edition retrofit skipped", {
      message: (retrofitErr as Error)?.message,
    });
  }
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
    let probe = await fetchCompanyInfo(bundle);

    // On 401, attempt a single forced refresh, then re-probe.
    if (probe.status === 401) {
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
        probe = await fetchCompanyInfo(bundle);
        if (probe.status === 401) {
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

    const healthStatus = statusFromHttp(probe.status);
    if (healthStatus === "healthy" && bundle.realmId) {
      await retrofitEditionFromCompanyInfo(bundle.realmId, probe.companyInfo);
    }

    return finalize({
      status: healthStatus,
      tokenSource: bundle.tokenSource,
      realmId: bundle.realmId,
      grantedScopes: bundle.grantedScopes,
      errorMessage: probe.status === 200 ? undefined : `QBO companyinfo returned ${probe.status}`,
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
