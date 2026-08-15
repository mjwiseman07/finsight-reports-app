/**
 * Authenticated (mode=user) QBO OAuth completion after token exchange.
 * Dual-writes legacy ERP adapter storage + canonical accounting_connections.
 * Returns the canonical connection id for redirect / dashboard hydration.
 */
import { getERPAdapter } from "@/lib/erp-adapters";
import { persistCanonicalAccountingConnectionGrant } from "@/lib/integrations/accounting/persist-canonical-connection-grant";
import { resolveOrCreateCompanyForProvider } from "@/lib/integrations/accounting/resolve-or-create-company";
import { parseOfferingSku, parseSubscriptionStatus } from "@/lib/erp/quickbooks/qbo-editions";
import { supabaseAdmin } from "@/lib/supabase";

function getQuickBooksTokenExpiry(token: { expires_in?: number | string }) {
  const expiresInSeconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export type QuickBooksCompanyProfile = {
  legal_name?: string;
  company_name?: string;
  home_currency?: string | null;
  multicurrency_enabled?: boolean;
  qbo_edition_raw?: string | null;
  qbo_subscription_status_raw?: string | null;
};

export async function persistAuthenticatedQuickBooksGrant(args: {
  userId: string;
  realmId: string;
  token: {
    access_token: string;
    refresh_token: string;
    expires_in?: number | string;
  };
  companyProfile?: QuickBooksCompanyProfile | null;
}): Promise<{
  erpConnectionId: string | null;
  accountingConnectionId: string;
  companyId: string | null;
}> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured");
  }

  const companyProfile = args.companyProfile || {};
  const companyName = companyProfile.legal_name || companyProfile.company_name || "QuickBooks Company";
  const now = new Date().toISOString();

  const userAdapter = getERPAdapter("quickbooks", args.userId);
  const savedErpConnection = await userAdapter.saveConnection({
    realmId: args.realmId,
    token: args.token,
  });

  const companyId = await resolveOrCreateCompanyForProvider(supabaseAdmin, {
    provider: "quickbooks",
    tenantId: args.realmId,
    userId: args.userId,
    tenantName: companyName,
  });

  const persisted = await persistCanonicalAccountingConnectionGrant({
    admin: supabaseAdmin,
    userId: args.userId,
    provider: "quickbooks",
    providerFamily: "intuit",
    providerProduct: "quickbooks_online",
    externalEntityId: `qbo:${args.realmId}`,
    externalEntityName: companyName,
    accessToken: args.token.access_token,
    refreshToken: args.token.refresh_token,
    tokenExpiresAt: getQuickBooksTokenExpiry(args.token),
    tenantOrRealmId: args.realmId,
    scopes: ["com.intuit.quickbooks.accounting"],
    status: "connected",
    companyId,
    nowIso: now,
    extraColumns: {
      home_currency: companyProfile.home_currency || null,
      qbo_edition: parseOfferingSku(companyProfile.qbo_edition_raw),
      qbo_subscription_status: parseSubscriptionStatus(companyProfile.qbo_subscription_status_raw),
    },
    metadataPatch: {
      realm_id: args.realmId,
      company_name: companyName,
      tenant_name: companyName,
      source_system: "quickbooks",
      active_provider: "quickbooks",
      connected_at: now,
      oauth_mode: "user",
      home_currency: companyProfile.home_currency || null,
      multicurrency_enabled: Boolean(companyProfile.multicurrency_enabled),
      qbo_edition: parseOfferingSku(companyProfile.qbo_edition_raw),
      qbo_subscription_status: parseSubscriptionStatus(companyProfile.qbo_subscription_status_raw),
      qbo_edition_raw: companyProfile.qbo_edition_raw || null,
      qbo_subscription_status_raw: companyProfile.qbo_subscription_status_raw || null,
      legacy_erp_connection_id: savedErpConnection?.id || null,
    },
  });

  return {
    erpConnectionId: savedErpConnection?.id || null,
    accountingConnectionId: persisted.connectionId,
    companyId,
  };
}
