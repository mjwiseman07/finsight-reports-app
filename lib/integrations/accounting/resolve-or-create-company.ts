/**
 * Phase WBP W1c.4c.2 — resolve or create a companies row by provider tenant identity.
 *
 * Called by the accounting write path (saveNormalizedSyncMetadata) BEFORE persisting
 * to accounting_syncs. Guarantees:
 *   1. accounting_syncs.company_id references a real companies.id (FK-safe).
 *   2. The row is scoped to the specific external tenant, not the user, so one
 *      user connecting multiple Xero organizations resolves to distinct companies.
 *
 * Extension pattern: for each new provider add:
 *   - a nullable text column companies.<provider>_tenant_id (or realm_id)
 *   - a partial UNIQUE index on that column
 *   - a branch in TENANT_COLUMN_BY_PROVIDER
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Provider = "xero" | "quickbooks";

const TENANT_COLUMN_BY_PROVIDER: Record<Provider, "xero_tenant_id" | "qbo_realm_id"> = {
  xero: "xero_tenant_id",
  quickbooks: "qbo_realm_id",
};

const ACCOUNTING_SYSTEM_BY_PROVIDER: Record<Provider, string> = {
  xero: "xero",
  quickbooks: "quickbooks",
};

export interface ResolveOrCreateCompanyArgs {
  provider: Provider;
  tenantId: string | null;
  userId: string;
  firmId?: string | null;
  tenantName?: string | null;
}

export async function resolveOrCreateCompanyForProvider(
  admin: SupabaseClient,
  args: ResolveOrCreateCompanyArgs,
): Promise<string | null> {
  const { provider, tenantId, userId, firmId, tenantName } = args;
  if (!tenantId) {
    console.warn("[resolveOrCreateCompanyForProvider] no tenantId; cannot resolve", {
      provider,
      userId,
    });
    return null;
  }
  const column = TENANT_COLUMN_BY_PROVIDER[provider];
  if (!column) {
    console.warn("[resolveOrCreateCompanyForProvider] unsupported provider", { provider });
    return null;
  }

  // Step 1: look up by tenant identifier.
  const { data: existing, error: selectErr } = await admin
    .from("companies")
    .select("id")
    .eq(column, tenantId)
    .limit(1);
  if (selectErr) {
    console.warn("[resolveOrCreateCompanyForProvider] select failed", {
      provider,
      tenantId,
      error: selectErr.message,
    });
    return null;
  }
  if (existing?.[0]?.id) return String(existing[0].id);

  // Step 2: insert a new row.
  const safeName =
    (tenantName && tenantName.trim()) ||
    (provider === "xero" ? "Xero Organization" : "QuickBooks Company");
  const insertPayload: Record<string, unknown> = {
    name: safeName,
    accounting_system: ACCOUNTING_SYSTEM_BY_PROVIDER[provider],
    [column]: tenantId,
    account_type: "my-own-company",
    industry_type: "Other",
    primary_persona: "business-owner",
    package_level: "essential",
    billing_status: "trial",
    onboarding_status: "not_started",
  };
  if (firmId) insertPayload.practice_id = firmId;

  const { data: created, error: insertErr } = await admin
    .from("companies")
    .insert(insertPayload)
    .select("id")
    .limit(1);
  if (insertErr) {
    // Race with concurrent connect: re-select.
    if (/duplicate key|unique constraint/i.test(insertErr.message)) {
      const { data: raced } = await admin
        .from("companies")
        .select("id")
        .eq(column, tenantId)
        .limit(1);
      if (raced?.[0]?.id) return String(raced[0].id);
    }
    console.error("[resolveOrCreateCompanyForProvider] insert failed", {
      provider,
      tenantId,
      error: insertErr.message,
    });
    return null;
  }
  const newId = created?.[0]?.id ? String(created[0].id) : null;

  // Step 3: best-effort ensure a company_users owner row so future
  // resolveCompanyIdForUser calls find this company too.
  if (newId) {
    const { error: memberErr } = await admin
      .from("company_users")
      .insert({
        company_id: newId,
        user_id: userId,
        role: "owner_executive",
        status: "active",
      });
    if (memberErr && !/duplicate key|unique constraint/i.test(memberErr.message)) {
      console.warn("[resolveOrCreateCompanyForProvider] company_users insert failed (non-blocking)", {
        userId,
        companyId: newId,
        error: memberErr.message,
      });
    }
  }
  return newId;
}
