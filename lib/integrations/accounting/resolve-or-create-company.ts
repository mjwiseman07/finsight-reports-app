/**
 * Phase: provider-aware company resolution for accounting sync persist.
 *
 * Reference: 652cb60e (resolveOrCreateCompanyForProvider) — ported without
 * dashboard / OAuth / lifecycle passengers.
 *
 * Guarantees:
 *   1. accounting_syncs.company_id references a real companies.id (FK-safe).
 *   2. Resolution is keyed by external tenant identity, not user_id, so one
 *      user connecting multiple Xero/QBO organizations maps to distinct companies.
 *   3. user_id is NEVER used as company_id.
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

/** Reject candidates that are missing or equal to the authenticated user_id. */
export function rejectUserIdShapedCompanyId(candidate: unknown, userId: string): string | null {
  if (typeof candidate !== "string" || !candidate) return null;
  if (userId && candidate === userId) return null;
  return candidate;
}

/**
 * Normalize provider tenant identity from connection fields.
 * Strips legacy prefixes like `xero:` / `qbo:` from external_entity_id.
 */
export function deriveProviderTenantId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.replace(/^(xero|qbo|quickbooks):/i, "") || null;
}

export type AccountingCompanyResolutionErrorCode = "ACCOUNTING_COMPANY_RESOLUTION_FAILED";

/**
 * Fail-closed when a known provider tenant cannot be anchored to companies.id.
 * Safe diagnostics only — never tokens/secrets.
 */
export class AccountingCompanyResolutionError extends Error {
  code: AccountingCompanyResolutionErrorCode = "ACCOUNTING_COMPANY_RESOLUTION_FAILED";
  connectionId: string;
  provider: string;
  tenantId: string | null;
  tenantName: string | null;

  constructor(args: {
    connectionId: string;
    provider: string;
    tenantId: string | null;
    tenantName?: string | null;
    causeMessage?: string;
  }) {
    super(
      `Accounting company resolution failed for ${args.provider} connection ${args.connectionId}` +
        (args.causeMessage ? `: ${args.causeMessage}` : ""),
    );
    this.name = "AccountingCompanyResolutionError";
    this.connectionId = args.connectionId;
    this.provider = args.provider;
    this.tenantId = args.tenantId;
    this.tenantName = args.tenantName ?? null;
  }
}

/**
 * Known provider tenant + unresolved companies.id => throw (do not persist orphan sync).
 * Tenant-less legacy paths may return null.
 */
export function requireCompanyIdForTenantBackedSync(args: {
  companyId: string | null;
  resolvedTenantId: string | null;
  connectionId: string;
  provider: string;
  tenantName?: string | null;
}): string | null {
  if (args.resolvedTenantId && !args.companyId) {
    throw new AccountingCompanyResolutionError({
      connectionId: args.connectionId,
      provider: args.provider,
      tenantId: args.resolvedTenantId,
      tenantName: args.tenantName ?? null,
    });
  }
  return args.companyId;
}

export async function resolveOrCreateCompanyForProvider(
  admin: SupabaseClient,
  args: ResolveOrCreateCompanyArgs,
): Promise<string | null> {
  const { provider, tenantId, userId, firmId, tenantName } = args;
  const normalizedTenantId = deriveProviderTenantId(tenantId);
  if (!normalizedTenantId) {
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
    .eq(column, normalizedTenantId)
    .limit(1);
  if (selectErr) {
    console.warn("[resolveOrCreateCompanyForProvider] select failed", {
      provider,
      tenantId: normalizedTenantId,
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
    [column]: normalizedTenantId,
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
        .eq(column, normalizedTenantId)
        .limit(1);
      if (raced?.[0]?.id) return String(raced[0].id);
    }
    console.error("[resolveOrCreateCompanyForProvider] insert failed", {
      provider,
      tenantId: normalizedTenantId,
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

export interface ResolveCompanyIdForSyncPersistArgs {
  provider: Provider;
  tenantId: string | null;
  userId: string;
  firmId?: string | null;
  tenantName?: string | null;
  normalizedCompanyId?: string | null;
  metadataCompanyId?: string | null;
}

/**
 * Precedence for accounting_syncs.company_id:
 *   1. Provider/tenant resolve-or-create (canonical)
 *   2. Safe normalizedData / metadata company ids (never user_id-shaped)
 *   3. resolveCompanyIdForUser ONLY when tenant identity is absent
 * Never returns connection.user_id.
 */
export async function resolveCompanyIdForSyncPersist(
  admin: SupabaseClient,
  args: ResolveCompanyIdForSyncPersistArgs,
): Promise<string | null> {
  const providerResolved = await resolveOrCreateCompanyForProvider(admin, {
    provider: args.provider,
    tenantId: args.tenantId,
    userId: args.userId,
    firmId: args.firmId,
    tenantName: args.tenantName,
  });
  if (providerResolved) return providerResolved;

  const safeNormalized = rejectUserIdShapedCompanyId(args.normalizedCompanyId, args.userId);
  const safeMeta = rejectUserIdShapedCompanyId(args.metadataCompanyId, args.userId);
  if (safeNormalized || safeMeta) return safeNormalized || safeMeta;

  const hasTenant = Boolean(deriveProviderTenantId(args.tenantId));
  // When a tenant id was present but provider resolve failed, do not let a
  // multi-company user-level lookup override tenant-scoped identity.
  if (hasTenant) {
    console.warn("[resolveCompanyIdForSyncPersist] provider/tenant unresolved; refusing user-level override", {
      provider: args.provider,
      userId: args.userId,
    });
    return null;
  }

  try {
    const { resolveCompanyIdForUser } = await import("./resolve-company-id");
    return await resolveCompanyIdForUser(admin, args.userId);
  } catch (err) {
    console.warn("[resolveCompanyIdForSyncPersist] resolveCompanyIdForUser failed", {
      userId: args.userId,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
