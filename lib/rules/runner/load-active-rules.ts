import type { SupabaseClient } from "@supabase/supabase-js";
import type { LoadedRule } from "./types";

export interface ClientContext {
  firm_client_id: string;
  company_id: string; // D6.2a — resolved here so rules don't refetch
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
    .select("id, company_id, industry_vertical, accounting_method, vertical_rules_enabled")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    firm_client_id: data.id,
    company_id: data.company_id,
    industry_vertical: data.industry_vertical,
    accounting_method: data.accounting_method,
    vertical_rules_enabled: data.vertical_rules_enabled,
  };
}

/**
 * D6.2a — a rule runs only when BOTH gates pass:
 *   1. curated_rules_registry.is_active = true AND vertical in {general, client vertical}
 *   2. client_active_rules has a row for (firm_client, rule) with is_enabled = true
 *      AND disabled_at IS NULL.
 * override_severity (when set on the activation row) supersedes the registry severity.
 */
export async function loadActiveRules(
  supabase: SupabaseClient,
  client: ClientContext,
  ruleIdFilter?: string[],
): Promise<LoadedRule[]> {
  // 1. Registry rules for this client's verticals, is_active = true.
  let registryQuery = supabase
    .from("curated_rules_registry")
    .select(
      "rule_id, version, vertical, severity, applies_to_cash_basis, applies_to_accrual_basis, is_active",
    )
    .eq("is_active", true)
    .in("vertical", ["general", client.industry_vertical]);
  if (ruleIdFilter && ruleIdFilter.length > 0) {
    registryQuery = registryQuery.in("rule_id", ruleIdFilter);
  }
  const { data: registryRows, error: regErr } = await registryQuery;
  if (regErr) throw regErr;
  if (!registryRows || registryRows.length === 0) return [];

  const registryRuleIds = registryRows.map((r) => r.rule_id);

  // 2. Per-client activation gate.
  const { data: activationRows, error: actErr } = await supabase
    .from("client_active_rules")
    .select("rule_id, is_enabled, override_severity, disabled_at")
    .eq("firm_client_id", client.firm_client_id)
    .in("rule_id", registryRuleIds);
  if (actErr) throw actErr;

  const activationByRuleId = new Map((activationRows ?? []).map((a) => [a.rule_id, a]));

  // 3. Keep only rules with an enabled, non-disabled activation row.
  return registryRows
    .filter((r) => {
      const act = activationByRuleId.get(r.rule_id);
      return act && act.is_enabled === true && act.disabled_at === null;
    })
    .map((r) => {
      const act = activationByRuleId.get(r.rule_id);
      const severity =
        (act?.override_severity as LoadedRule["severity"] | undefined) ?? r.severity;
      return {
        rule_id: r.rule_id,
        rule_version: r.version,
        vertical: r.vertical,
        severity,
        applies_to_cash_basis: r.applies_to_cash_basis,
        applies_to_accrual_basis: r.applies_to_accrual_basis,
        is_active: r.is_active,
      };
    });
}
