/**
 * Rule Execution Service (Doc D0).
 *
 * Loads the curated rule registry (filtered by the client's industry_vertical
 * and accounting_method), applies per-client overrides from client_active_rules,
 * then executes each rule's logic module and aggregates results.
 *
 * NOTE (deviation from spec): the spec says "dynamically imports logic_file_path".
 * Next/Turbopack cannot bundle a fully dynamic runtime import path, so we resolve
 * modules through a static import registry keyed by logic_file_path. Adding a rule
 * means seeding the registry row AND registering its loader here.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import * as clientMemoryService from "@/lib/memory/client-memory-service";
import type {
  AccountingMethod,
  ActiveRule,
  RuleExecutionContext,
  RuleExecutionResult,
  RuleModule,
  RuleResult,
} from "@/lib/rules/types";

type RuleLoader = () => Promise<RuleModule>;

/** Static registry: logic_file_path -> module loader. */
const RULE_LOADERS: Record<string, RuleLoader> = {
  "lib/rules/logic/general/je_balance_check.ts": () =>
    import("@/lib/rules/logic/general/je_balance_check"),
  "lib/rules/logic/general/je_period_check.ts": () =>
    import("@/lib/rules/logic/general/je_period_check"),
  "lib/rules/logic/general/cash_negative_check.ts": () =>
    import("@/lib/rules/logic/general/cash_negative_check"),
  "lib/rules/logic/general/ap_missed_vendor_check.ts": () =>
    import("@/lib/rules/logic/general/ap_missed_vendor_check"),
  "lib/rules/logic/general/revenue_cutoff_check.ts": () =>
    import("@/lib/rules/logic/general/revenue_cutoff_check"),
  "lib/rules/logic/general/depreciation_scheduled_check.ts": () =>
    import("@/lib/rules/logic/general/depreciation_scheduled_check"),
  "lib/rules/logic/general/prepaid_amortization_check.ts": () =>
    import("@/lib/rules/logic/general/prepaid_amortization_check"),
  "lib/rules/logic/general/duplicate_vendor_bill_check.ts": () =>
    import("@/lib/rules/logic/general/duplicate_vendor_bill_check"),
};

interface FirmClientRow {
  id: string;
  industry_vertical: string | null;
  accounting_method: AccountingMethod | null;
}

async function loadFirmClient(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  firmClientId: string,
): Promise<FirmClientRow> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select("id, industry_vertical, accounting_method")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!data) throw new Error(`firm_client not found: ${firmClientId}`);
  return data as FirmClientRow;
}

/**
 * Return the effective active rule set for a client: registry rules matching the
 * client's vertical (or 'general') and basis, with per-client overrides applied.
 * A registry rule is enabled unless client_active_rules explicitly disables it.
 */
export async function getActiveRulesForClient(firmClientId: string): Promise<ActiveRule[]> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();
  const client = await loadFirmClient(supabase, firmClientId);
  const vertical = client.industry_vertical ?? "general";
  const method: AccountingMethod = client.accounting_method ?? "accrual";

  const { data: registry, error: regErr } = await supabase
    .from("curated_rules_registry")
    .select("*")
    .eq("is_active", true)
    .in("vertical", Array.from(new Set(["general", vertical])));
  if (regErr) throw new Error(`rule registry lookup failed: ${regErr.message}`);

  const { data: overrides, error: ovErr } = await supabase
    .from("client_active_rules")
    .select("rule_id, is_enabled, override_severity")
    .eq("firm_client_id", firmClientId);
  if (ovErr) throw new Error(`client_active_rules lookup failed: ${ovErr.message}`);

  const overrideMap = new Map<string, { is_enabled: boolean; override_severity: string | null }>();
  for (const o of overrides ?? []) {
    overrideMap.set(o.rule_id as string, {
      is_enabled: o.is_enabled as boolean,
      override_severity: (o.override_severity as string) ?? null,
    });
  }

  const result: ActiveRule[] = [];
  for (const r of registry ?? []) {
    const override = overrideMap.get(r.rule_id as string);
    const isEnabled = override ? override.is_enabled : true;
    if (!isEnabled) continue;

    // Basis compatibility.
    if (method === "cash" && r.applies_to_cash_basis === false) continue;
    if (method === "accrual" && r.applies_to_accrual_basis === false) continue;

    result.push({
      ruleId: r.rule_id as string,
      ruleName: r.rule_name as string,
      ruleCategory: r.rule_category as string,
      vertical: r.vertical as string,
      severity: (override?.override_severity as ActiveRule["severity"]) ?? (r.severity as ActiveRule["severity"]),
      logicFilePath: r.logic_file_path as string,
      description: r.description as string,
      appliesToCashBasis: r.applies_to_cash_basis as boolean,
      appliesToAccrualBasis: r.applies_to_accrual_basis as boolean,
      requiresHistoryMonths: r.requires_history_months as number,
      isEnabled: true,
    });
  }
  return result;
}

/**
 * Execute all active rules for a client + close period and aggregate results.
 */
export async function executeRulesForClient(
  firmClientId: string,
  closePeriodId: string,
  context: RuleExecutionContext = {},
): Promise<RuleExecutionResult> {
  if (!firmClientId) throw new Error("firmClientId is required");
  if (!closePeriodId) throw new Error("closePeriodId is required");

  const supabase = getSupabaseAdmin();
  const client = await loadFirmClient(supabase, firmClientId);
  const accountingMethod: AccountingMethod = client.accounting_method ?? "accrual";
  const industryVertical = client.industry_vertical ?? "general";

  const activeRules = await getActiveRulesForClient(firmClientId);

  const ruleContext = {
    firmClientId,
    closePeriodId,
    accountingMethod,
    memoryService: clientMemoryService,
    qboClient: context.qboClient ?? null,
  };

  const results: RuleResult[] = [];
  for (const rule of activeRules) {
    const loader = RULE_LOADERS[rule.logicFilePath];
    if (!loader) {
      results.push({
        ruleId: rule.ruleId,
        status: "error",
        findings: [
          {
            code: "loader_missing",
            message: `No logic loader registered for ${rule.logicFilePath}`,
            severity: "error",
          },
        ],
        proposedActions: [],
        reviewNotes: [],
      });
      continue;
    }
    try {
      const mod = await loader();
      const res = await mod.execute(ruleContext);
      results.push(res);
    } catch (err) {
      results.push({
        ruleId: rule.ruleId,
        status: "error",
        findings: [
          {
            code: "execution_error",
            message: err instanceof Error ? err.message : String(err),
            severity: "error",
          },
        ],
        proposedActions: [],
        reviewNotes: [],
      });
    }
  }

  const tally = (s: RuleResult["status"]) => results.filter((r) => r.status === s).length;

  return {
    firmClientId,
    closePeriodId,
    industryVertical,
    accountingMethod,
    executed: results.length,
    passed: tally("pass"),
    failed: tally("fail"),
    skipped: tally("skip"),
    errored: tally("error"),
    results,
    generatedAt: new Date().toISOString(),
  };
}
