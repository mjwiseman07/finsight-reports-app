/**
 * QBO Write Preflight (Doc D1 + Phase Q7 edition capability gate).
 *
 * canPostToQBO() is the single gate every write path (D2 JE poster) must call
 * before attempting a QBO write. It confirms the write flag is on, the last
 * health check is recent and healthy, the token resolves cleanly, the
 * subscription permits writes, and the edition supports the requested
 * capability.
 *
 * Phase Q7 (Issue #7) — added subscription/edition capability gate.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient, type QBOTokenBundle } from "@/lib/erp/quickbooks/token-resolver";
import { checkQBOHealth } from "@/lib/erp/quickbooks/health-checker";
import {
  capabilityForEdition,
  parseSubscriptionStatus,
  subscriptionAllowsWrites,
  type QboCapability,
  type QboEdition,
  type QboSubscriptionStatus,
} from "@/lib/erp/quickbooks/qbo-editions";

export type WritePreflightReason =
  | "write_disabled"
  | "unhealthy_connection"
  | "stale_health_check"
  | "realm_missing"
  | "subscription_read_only"
  | "edition_missing_capability";

export interface WritePreflightResult {
  canWrite: boolean;
  reason?: WritePreflightReason;
  lastHealthCheck?: {
    status: string;
    checkedAt: string;
    ageMinutes: number;
  };
  tokenBundle?: QBOTokenBundle;
  edition?: QboEdition | null;
  subscriptionStatus?: QboSubscriptionStatus;
  missingCapability?: QboCapability;
}

export interface CanPostOptions {
  requireCapability?: QboCapability;
}

const HEALTH_MAX_AGE_MINUTES = 60;

function ageMinutes(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

/**
 * Confirms it is safe to write to QBO for a firm_client. Runs a fresh health
 * check inline when the last one is missing or older than 60 minutes. Then
 * (Phase Q7) verifies subscription is write-eligible and edition supports the
 * requested capability. Default capability is `journal_entry_write`.
 */
export async function canPostToQBO(
  firmClientId: string,
  options: CanPostOptions = {},
): Promise<WritePreflightResult> {
  const requireCapability: QboCapability = options.requireCapability ?? "journal_entry_write";
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();

  const { data: client, error } = await supabase
    .from("firm_clients")
    .select("id, qbo_write_enabled, qbo_last_health_check_at, qbo_last_health_check_status")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!client) {
    return { canWrite: false, reason: "realm_missing" };
  }

  if (!client.qbo_write_enabled) {
    return { canWrite: false, reason: "write_disabled" };
  }

  let status = client.qbo_last_health_check_status as string | null;
  let checkedAt = client.qbo_last_health_check_at as string | null;

  if (!checkedAt || ageMinutes(checkedAt) > HEALTH_MAX_AGE_MINUTES) {
    const fresh = await checkQBOHealth(firmClientId);
    status = fresh.status;
    checkedAt = new Date().toISOString();
  }

  const lastHealthCheck = {
    status: status ?? "unknown_error",
    checkedAt: checkedAt ?? new Date().toISOString(),
    ageMinutes: ageMinutes(checkedAt),
  };

  if (status !== "healthy") {
    return { canWrite: false, reason: "unhealthy_connection", lastHealthCheck };
  }

  const tokenBundle = await resolveQBOTokenForFirmClient(firmClientId);
  if (!tokenBundle || !tokenBundle.realmId) {
    return { canWrite: false, reason: "realm_missing", lastHealthCheck };
  }

  // Phase Q7 (Issue #7): subscription + edition capability gate.
  const { data: connectionRow } = await supabase
    .from("accounting_connections")
    .select("qbo_edition, qbo_subscription_status")
    .eq("tenant_or_realm_id", tokenBundle.realmId)
    .eq("provider", "quickbooks")
    .maybeSingle();

  const rawEdition = (connectionRow?.qbo_edition as string | null) ?? null;
  const rawStatus = (connectionRow?.qbo_subscription_status as string | null) ?? null;
  // DB stores already-normalized snake_case (simple_start/essentials/plus/advanced);
  // parseSubscriptionStatus handles both raw Intuit values and pre-normalized ones.
  const VALID_EDITIONS = new Set<QboEdition>(["simple_start", "essentials", "plus", "advanced"]);
  const edition: QboEdition | null =
    rawEdition && VALID_EDITIONS.has(rawEdition as QboEdition) ? (rawEdition as QboEdition) : null;
  const subscriptionStatus: QboSubscriptionStatus = parseSubscriptionStatus(rawStatus);

  if (!subscriptionAllowsWrites(subscriptionStatus)) {
    return {
      canWrite: false,
      reason: "subscription_read_only",
      lastHealthCheck,
      tokenBundle,
      edition,
      subscriptionStatus,
    };
  }

  if (!capabilityForEdition(edition, requireCapability)) {
    return {
      canWrite: false,
      reason: "edition_missing_capability",
      lastHealthCheck,
      tokenBundle,
      edition,
      subscriptionStatus,
      missingCapability: requireCapability,
    };
  }

  return {
    canWrite: true,
    lastHealthCheck,
    tokenBundle,
    edition,
    subscriptionStatus,
  };
}
