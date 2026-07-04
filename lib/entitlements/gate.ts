/**
 * Entitlement Gate — every Doc D add-on module MUST call assertEntitlement at
 * its entry point. Every check writes entitlement_check_audit.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type { AddonCode } from "./registry";
import { isAddonCode } from "./registry";

export class EntitlementDenied extends Error {
  constructor(
    public readonly addonCode: AddonCode | string,
    public readonly engagementId: string | null,
    public readonly reason: string,
  ) {
    super(
      `Entitlement denied: addon=${addonCode} engagement=${engagementId ?? "<none>"} reason=${reason}`,
    );
    this.name = "EntitlementDenied";
  }
}

export interface EntitlementCheckContext {
  caller: string;
  firmClientId?: string;
  correlationId?: string;
  actorType?: "user" | "system" | "ai_agent" | "integration" | "rule" | "recurring";
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason:
    | "active"
    | "inactive"
    | "no_engagement"
    | "unknown_addon"
    | "no_row"
    | "db_error";
  addonCode: string;
  engagementId: string | null;
}

export async function hasEntitlement(
  addonCode: string,
  engagementId: string | null,
  ctx: EntitlementCheckContext,
): Promise<EntitlementCheckResult> {
  if (!isAddonCode(addonCode)) {
    await writeAudit({
      engagementId,
      firmClientId: ctx.firmClientId,
      addonCode,
      allowed: false,
      caller: ctx.caller,
      reason: "unknown_addon",
      correlationId: ctx.correlationId,
      actorType: ctx.actorType ?? "system",
      actorId: ctx.actorId,
      metadata: ctx.metadata,
    });
    return { allowed: false, reason: "unknown_addon", addonCode, engagementId };
  }

  if (!engagementId) {
    await writeAudit({
      engagementId: null,
      firmClientId: ctx.firmClientId,
      addonCode,
      allowed: false,
      caller: ctx.caller,
      reason: "no_engagement",
      correlationId: ctx.correlationId,
      actorType: ctx.actorType ?? "system",
      actorId: ctx.actorId,
      metadata: ctx.metadata,
    });
    return { allowed: false, reason: "no_engagement", addonCode, engagementId };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("engagement_addons")
    .select("is_active")
    .eq("engagement_id", engagementId)
    .eq("addon_code", addonCode)
    .maybeSingle();

  if (error) {
    await writeAudit({
      engagementId,
      firmClientId: ctx.firmClientId,
      addonCode,
      allowed: false,
      caller: ctx.caller,
      reason: "db_error",
      correlationId: ctx.correlationId,
      actorType: ctx.actorType ?? "system",
      actorId: ctx.actorId,
      metadata: { ...(ctx.metadata ?? {}), dbError: error.message },
    });
    return { allowed: false, reason: "db_error", addonCode, engagementId };
  }

  if (!data) {
    await writeAudit({
      engagementId,
      firmClientId: ctx.firmClientId,
      addonCode,
      allowed: false,
      caller: ctx.caller,
      reason: "no_row",
      correlationId: ctx.correlationId,
      actorType: ctx.actorType ?? "system",
      actorId: ctx.actorId,
      metadata: ctx.metadata,
    });
    return { allowed: false, reason: "no_row", addonCode, engagementId };
  }

  const allowed = Boolean(data.is_active);
  await writeAudit({
    engagementId,
    firmClientId: ctx.firmClientId,
    addonCode,
    allowed,
    caller: ctx.caller,
    reason: allowed ? "active" : "inactive",
    correlationId: ctx.correlationId,
    actorType: ctx.actorType ?? "system",
    actorId: ctx.actorId,
    metadata: ctx.metadata,
  });

  return {
    allowed,
    reason: allowed ? "active" : "inactive",
    addonCode,
    engagementId,
  };
}

export async function assertEntitlement(
  addonCode: string,
  engagementId: string | null,
  ctx: EntitlementCheckContext,
): Promise<void> {
  const r = await hasEntitlement(addonCode, engagementId, ctx);
  if (!r.allowed) {
    throw new EntitlementDenied(r.addonCode, r.engagementId, r.reason);
  }
}

interface AuditRow {
  engagementId: string | null;
  firmClientId?: string;
  addonCode: string;
  allowed: boolean;
  caller: string;
  reason: string;
  correlationId?: string;
  actorType: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

async function writeAudit(row: AuditRow): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("entitlement_check_audit").insert({
    engagement_id: row.engagementId,
    firm_client_id: row.firmClientId ?? null,
    addon_code: row.addonCode,
    allowed: row.allowed,
    caller: row.caller,
    reason: row.reason,
    correlation_id: row.correlationId ?? null,
    actor_type: row.actorType,
    actor_id: row.actorId ?? null,
    metadata: row.metadata ?? {},
  });
  if (error) {
    console.error("[entitlement-audit] insert failed", error);
  }
}
