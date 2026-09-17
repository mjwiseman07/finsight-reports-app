import { fetchCanonicalReports } from "@/lib/integrations/accounting";
import { RA_PRO_TIER_KEY, isRaProAuthorizingPilotStatus } from "@/lib/review-assist-pro/limits";
import { createServiceClient } from "@/lib/supabase/service";

export const RA_PRO_ACCOUNTING_REFRESH_BUDGET_MS = 4 * 60 * 1000;

type Provider = "quickbooks" | "xero";

export type ConnectedAccountingGrant = {
  id: string;
  user_id: string;
  provider: Provider;
  tenant_or_realm_id: string | null;
  external_entity_id: string | null;
};

type LinkedFirm = { id: string; billing_company_id: string | null };
type PilotSlot = { company_id: string | null; pilot_status: string | null };
type FirmClient = { firm_id: string; company_id: string | null };
type CompanyTenant = {
  id: string;
  qbo_realm_id: string | null;
  xero_tenant_id: string | null;
};

export type HourlyRefreshSummary = {
  status: "ok" | "partial";
  started_at: string;
  completed_at: string;
  eligible_connections: number;
  attempted: number;
  succeeded: number;
  failed: number;
  skipped_budget: number;
  providers: Record<Provider, { attempted: number; succeeded: number; failed: number }>;
  failures: Array<{ connection_id: string; provider: Provider; code: string }>;
};

function normalizedTenant(value: unknown): string {
  return String(value ?? "").trim();
}

function providerTenantKey(provider: Provider, tenant: string): string {
  return `${provider}:${tenant}`;
}

/**
 * Pure eligibility join for the hourly worker.
 *
 * Automation is limited to client companies beneath a linked, authorizing RA
 * Pro firm. Unlinked legacy firms, non-authorizing slots, and ambiguous/missing
 * provider tenant identifiers fail closed.
 */
export function selectEligibleRaProConnections(input: {
  firms: LinkedFirm[];
  slots: PilotSlot[];
  firmClients: FirmClient[];
  companies: CompanyTenant[];
  connections: ConnectedAccountingGrant[];
}): ConnectedAccountingGrant[] {
  const authorizingCompanies = new Set(
    input.slots
      .filter(
        (slot) =>
          !!slot.company_id &&
          isRaProAuthorizingPilotStatus(slot.pilot_status),
      )
      .map((slot) => slot.company_id as string),
  );

  const eligibleFirmIds = new Set(
    input.firms
      .filter(
        (firm) =>
          !!firm.billing_company_id &&
          authorizingCompanies.has(firm.billing_company_id),
      )
      .map((firm) => firm.id),
  );

  const eligibleClientCompanyIds = new Set(
    input.firmClients
      .filter(
        (client) =>
          eligibleFirmIds.has(client.firm_id) && !!client.company_id,
      )
      .map((client) => client.company_id as string),
  );

  const eligibleTenantKeys = new Set<string>();
  for (const company of input.companies) {
    if (!eligibleClientCompanyIds.has(company.id)) continue;
    const qboRealm = normalizedTenant(company.qbo_realm_id);
    const xeroTenant = normalizedTenant(company.xero_tenant_id);
    if (qboRealm) eligibleTenantKeys.add(providerTenantKey("quickbooks", qboRealm));
    if (xeroTenant) eligibleTenantKeys.add(providerTenantKey("xero", xeroTenant));
  }

  const seen = new Set<string>();
  return input.connections.filter((connection) => {
    if (seen.has(connection.id)) return false;
    const tenant = normalizedTenant(
      connection.tenant_or_realm_id || connection.external_entity_id,
    ).replace(/^qbo:/, "");
    if (!tenant) return false;
    const eligible = eligibleTenantKeys.has(
      providerTenantKey(connection.provider, tenant),
    );
    if (eligible) seen.add(connection.id);
    return eligible;
  });
}

export function currentMonthToDate(now = new Date()): {
  startDate: string;
  endDate: string;
} {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return {
    startDate: `${year}-${month}-01`,
    endDate: now.toISOString().slice(0, 10),
  };
}

function errorCode(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/token|credential|oauth/i.test(raw)) return "provider_credentials_unavailable";
  if (/superseded/i.test(raw)) return "connection_superseded";
  if (/ambiguous|mismatch/i.test(raw)) return "connection_scope_conflict";
  if (/validation|incomplete|preflight/i.test(raw)) return "provider_data_incomplete";
  return "refresh_failed";
}

async function loadEligibleConnections(): Promise<ConnectedAccountingGrant[]> {
  const db = createServiceClient();
  const { data: firms, error: firmError } = await db
    .from("firms")
    .select("id, billing_company_id")
    .not("billing_company_id", "is", null);
  if (firmError) throw firmError;

  const billingCompanyIds = (firms ?? [])
    .map((firm) => firm.billing_company_id as string | null)
    .filter((id): id is string => !!id);
  if (billingCompanyIds.length === 0) return [];

  const { data: slots, error: slotError } = await db
    .from("pilot_slots")
    .select("company_id, pilot_status")
    .eq("tier_key", RA_PRO_TIER_KEY)
    .in("company_id", billingCompanyIds);
  if (slotError) throw slotError;

  const authorizingCompanyIds = new Set(
    (slots ?? [])
      .filter((slot) => isRaProAuthorizingPilotStatus(slot.pilot_status as string))
      .map((slot) => slot.company_id as string),
  );
  const eligibleFirmIds = (firms ?? [])
    .filter((firm) => authorizingCompanyIds.has(firm.billing_company_id as string))
    .map((firm) => firm.id as string);
  if (eligibleFirmIds.length === 0) return [];

  const { data: firmClients, error: clientError } = await db
    .from("firm_clients")
    .select("firm_id, company_id")
    .in("firm_id", eligibleFirmIds)
    .eq("subscription_status", "active");
  if (clientError) throw clientError;

  const clientCompanyIds = (firmClients ?? [])
    .map((client) => client.company_id as string | null)
    .filter((id): id is string => !!id);
  if (clientCompanyIds.length === 0) return [];

  const { data: companies, error: companyError } = await db
    .from("companies")
    .select("id, qbo_realm_id, xero_tenant_id")
    .in("id", clientCompanyIds);
  if (companyError) throw companyError;

  const tenantKeys = new Set<string>();
  for (const company of companies ?? []) {
    const qboRealm = normalizedTenant(company.qbo_realm_id);
    const xeroTenant = normalizedTenant(company.xero_tenant_id);
    if (qboRealm) tenantKeys.add(providerTenantKey("quickbooks", qboRealm));
    if (xeroTenant) tenantKeys.add(providerTenantKey("xero", xeroTenant));
  }
  if (tenantKeys.size === 0) return [];

  const { data: connections, error: connectionError } = await db
    .from("accounting_connections")
    .select(
      "id, user_id, provider, tenant_or_realm_id, external_entity_id",
    )
    .eq("status", "connected")
    .in("provider", ["quickbooks", "xero"]);
  if (connectionError) throw connectionError;

  return (connections ?? []).filter((connection) => {
    const provider = connection.provider as Provider;
    const tenant = normalizedTenant(
      connection.tenant_or_realm_id || connection.external_entity_id,
    ).replace(/^qbo:/, "");
    return !!tenant && tenantKeys.has(providerTenantKey(provider, tenant));
  }) as ConnectedAccountingGrant[];
}

export async function runRaProHourlyAccountingRefresh(options?: {
  now?: Date;
  budgetMs?: number;
  loadConnections?: () => Promise<ConnectedAccountingGrant[]>;
  refresh?: typeof fetchCanonicalReports;
}): Promise<HourlyRefreshSummary> {
  const now = options?.now ?? new Date();
  const budgetStartedAtMs = Date.now();
  const budgetMs = options?.budgetMs ?? RA_PRO_ACCOUNTING_REFRESH_BUDGET_MS;
  const loadConnections = options?.loadConnections ?? loadEligibleConnections;
  const refresh = options?.refresh ?? fetchCanonicalReports;
  const connections = await loadConnections();
  const dateRange = currentMonthToDate(now);

  const providers: HourlyRefreshSummary["providers"] = {
    quickbooks: { attempted: 0, succeeded: 0, failed: 0 },
    xero: { attempted: 0, succeeded: 0, failed: 0 },
  };
  const failures: HourlyRefreshSummary["failures"] = [];
  let skippedBudget = 0;

  for (let index = 0; index < connections.length; index += 1) {
    if (Date.now() - budgetStartedAtMs >= budgetMs) {
      skippedBudget = connections.length - index;
      break;
    }
    const connection = connections[index];
    providers[connection.provider].attempted += 1;
    try {
      await refresh({
        connectionId: connection.id,
        userId: connection.user_id,
        sourceSystem: connection.provider,
        dateRange,
      });
      providers[connection.provider].succeeded += 1;
    } catch (error) {
      providers[connection.provider].failed += 1;
      failures.push({
        connection_id: connection.id,
        provider: connection.provider,
        code: errorCode(error),
      });
    }
  }

  const attempted = providers.quickbooks.attempted + providers.xero.attempted;
  const succeeded = providers.quickbooks.succeeded + providers.xero.succeeded;
  const failed = providers.quickbooks.failed + providers.xero.failed;
  return {
    status: failed > 0 || skippedBudget > 0 ? "partial" : "ok",
    started_at: now.toISOString(),
    completed_at: new Date().toISOString(),
    eligible_connections: connections.length,
    attempted,
    succeeded,
    failed,
    skipped_budget: skippedBudget,
    providers,
    failures,
  };
}
