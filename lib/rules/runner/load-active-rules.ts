import type { SupabaseClient } from "@supabase/supabase-js";
import type { LoadedRule } from "./types";

export interface ClientContext {
  firm_client_id: string;
  industry_vertical: string;
  accounting_method: "cash" | "accrual" | "modified_cash";
  vertical_rules_enabled: boolean;
}

export async function loadClient(
  supabase: SupabaseClient,
  firmClientId: string,
): Promise<ClientContext | null> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select("id, industry_vertical, accounting_method, vertical_rules_enabled")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    firm_client_id: data.id,
    industry_vertical: data.industry_vertical,
    accounting_method: data.accounting_method,
    vertical_rules_enabled: data.vertical_rules_enabled,
  };
}

export async function loadActiveRules(
  supabase: SupabaseClient,
  client: ClientContext,
  ruleIdFilter?: string[],
): Promise<LoadedRule[]> {
  let query = supabase
    .from("curated_rules_registry")
    .select(
      "rule_id, version, vertical, severity, applies_to_cash_basis, applies_to_accrual_basis, is_active",
    )
    .eq("is_active", true)
    .in("vertical", ["general", client.industry_vertical]);
  if (ruleIdFilter && ruleIdFilter.length > 0) {
    query = query.in("rule_id", ruleIdFilter);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    rule_id: r.rule_id,
    rule_version: r.version,
    vertical: r.vertical,
    severity: r.severity,
    applies_to_cash_basis: r.applies_to_cash_basis,
    applies_to_accrual_basis: r.applies_to_accrual_basis,
    is_active: r.is_active,
  }));
}
