/**
 * Phase DASH_1B.2 — Anchor bootstrap for the single-chain lifecycle log.
 * Phase W1c.4c.5-A — Anchor company_id resolves from the CONNECTION (SoR),
 * not the user's default owner_executive membership. This is required so that
 * users with multiple provider connections (Xero + QBO) get separate company
 * anchors per tenant, matching the accounting_syncs.company_id resolution
 * done by resolveOrCreateCompanyForProvider (W1c.4c.2).
 *
 * On first accounting connect, every authenticated user gets:
 *   1. A `companies` row (keyed on provider + tenant_or_realm_id).
 *   2. A `company_users` membership on that company (upserted).
 *   3. A `pilot_slots` row with tier_key='free_trial_connected', status='active'.
 *
 * This satisfies the patent-6 single-subject requirement: billing + sync +
 * assertion lifecycle events all resolve to the same pilot_slot per tenant.
 *
 * Idempotent. Safe to call on every sync.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { bootstrapCompanyForUser } from "../tcp1/create-session-company";

export type EnsureAnchorConnection = {
  id: string;
  provider: string;
  external_entity_id: string | null;
  external_entity_name: string | null;
  /** Preferred over external_entity_id when both exist (matches emit resolver). */
  tenant_or_realm_id?: string | null;
};

export type EnsureAnchorParams = {
  admin: SupabaseClient;
  userId: string;
  /**
   * Canonical source-system company name. Must be resolved via
   * resolveEmitCompanyName (SoR chain) before calling. Never a manufactured
   * fallback like "Unnamed Company".
   */
  sourceSystemCompanyName: string;
  /**
   * Connection whose provider + external_entity_id anchors the lifecycle
   * chain. When present, company_id is resolved via
   * resolveOrCreateCompanyForProvider so multi-connection users get separate
   * anchors per tenant. If omitted (or if external_entity_id is null),
   * falls back to bootstrapCompanyForUser (legacy path, user default).
   */
  connection?: EnsureAnchorConnection | null;
};

export type EnsureAnchorResult = {
  companyId: string;
  pilotSlotId: string;
  companyCreated: boolean;
  pilotSlotCreated: boolean;
  resolvedVia: "connection" | "user_default";
};

export async function ensureLifecycleAnchor(params: EnsureAnchorParams): Promise<EnsureAnchorResult> {
  const { admin, userId, sourceSystemCompanyName, connection } = params;

  if (!sourceSystemCompanyName || sourceSystemCompanyName.trim().length === 0) {
    throw new Error(
      "ensureLifecycleAnchor: sourceSystemCompanyName is required (must copy from source system, not fallback)",
    );
  }

  let companyId: string;
  let companyCreated = false;
  let resolvedVia: "connection" | "user_default";

  // 1. Prefer the SoR path when we have a connection with a tenant/realm id.
  //    This matches accounting_syncs.company_id and is what customer audits
  //    need to see: "QBO event on QBO's company," not "QBO event on the
  //    user's default company."
  const tenantId =
    (connection?.tenant_or_realm_id || connection?.external_entity_id || "").trim() || null;

  if (connection && tenantId) {
    const { resolveOrCreateCompanyForProvider } = await import(
      "../integrations/accounting/resolve-or-create-company"
    );
    const resolvedId = await resolveOrCreateCompanyForProvider(admin, {
      provider: connection.provider as "xero" | "quickbooks",
      tenantId,
      userId,
      tenantName: sourceSystemCompanyName,
    });
    if (resolvedId) {
      companyId = resolvedId;
      resolvedVia = "connection";

      // Ensure the calling user has an owner_executive membership on this
      // company. A user can legitimately own multiple companies (Xero + QBO
      // connected to different books). Upsert is idempotent.
      const { data: existingMembership } = await admin
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (!existingMembership) {
        const { error: membershipErr } = await admin
          .from("company_users")
          .insert({
            company_id: companyId,
            user_id: userId,
            role: "owner_executive",
            status: "active",
          });
        if (membershipErr) {
          // Non-fatal — the emit still succeeds; the RLS impact is
          // downstream and will surface if the user tries to query this
          // company from the app. Log loudly.
          console.warn(
            "[ensureLifecycleAnchor] company_users membership upsert failed (non-blocking)",
            {
              userId,
              companyId,
              error: membershipErr.message,
            },
          );
        }
      }
    } else {
      // Resolver returned null despite tenant id — fall through to
      // bootstrap. Should be rare and worth logging.
      console.warn(
        "[ensureLifecycleAnchor] resolveOrCreateCompanyForProvider returned null; falling back to user default",
        {
          connectionId: connection.id,
          provider: connection.provider,
          externalEntityId: connection.external_entity_id,
          tenantOrRealmId: connection.tenant_or_realm_id,
        },
      );
      const bootstrap = await bootstrapCompanyForUser({
        admin,
        userId,
        businessName: sourceSystemCompanyName,
      });
      companyId = bootstrap.companyId;
      companyCreated = bootstrap.created;
      resolvedVia = "user_default";
    }
  } else {
    // 2. Legacy path — no connection or no tenant id. Fall back to the
    //    user's default owner_executive membership.
    const bootstrap = await bootstrapCompanyForUser({
      admin,
      userId,
      businessName: sourceSystemCompanyName,
    });
    companyId = bootstrap.companyId;
    companyCreated = bootstrap.created;
    resolvedVia = "user_default";
  }

  // 3. Upsert the free_trial_connected pilot_slot on the resolved company.
  const { data: existingSlot, error: lookupErr } = await admin
    .from("pilot_slots")
    .select("id")
    .eq("tier_key", "free_trial_connected")
    .eq("company_id", companyId)
    .maybeSingle();

  if (lookupErr) {
    console.error("[ensureLifecycleAnchor] pilot_slots lookup failed", lookupErr);
    throw new Error("pilot_slot_lookup_failed");
  }

  if (existingSlot?.id) {
    return {
      companyId,
      pilotSlotId: existingSlot.id as string,
      companyCreated,
      pilotSlotCreated: false,
      resolvedVia,
    };
  }

  const { data: newSlot, error: insertErr } = await admin
    .from("pilot_slots")
    .insert({
      tier_key: "free_trial_connected",
      pilot_status: "active",
      pricing_structure: "flat",
      pricing_cadence: "monthly",
      company_id: companyId,
      firm_id: null,
    })
    .select("id")
    .single();

  if (insertErr || !newSlot) {
    console.error("[ensureLifecycleAnchor] pilot_slots insert failed", insertErr);
    throw new Error("pilot_slot_create_failed");
  }

  return {
    companyId,
    pilotSlotId: newSlot.id as string,
    companyCreated,
    pilotSlotCreated: true,
    resolvedVia,
  };
}
