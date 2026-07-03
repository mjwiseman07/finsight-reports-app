// D6.0 — vertical rule execution contract.
//
// SEPARATE from the D0 lib/rules/types.ts (which defines the close-time
// RuleModule.execute() / RuleResult{status,findings,...} contract used by
// rule-execution-service.ts and the D0 general/* logic modules). D6 rules are
// per-target evaluations that fire against the curated_rule_fires audit table,
// so they need their own context/result shape. Keeping them in a distinct file
// avoids breaking the existing D0 subsystem.

export interface RuleContext {
  firmClientId: string;
  industryVertical: string;
  accountingMethod: "cash" | "accrual" | "modified_cash";
  targetType:
    | "transaction"
    | "account"
    | "period"
    | "vendor"
    | "customer"
    | "item"
    | "contract"
    | "project"
    | "other";
  targetRef: string;
  inputs: Record<string, unknown>;
  inputsHash: string;
}

export interface RuleResult {
  fired: boolean;
  outcome: "fired" | "suppressed" | "error" | "not_implemented";
  reason_code: string;
  reason_detail: Record<string, unknown>;
  severity_override?: "info" | "warning" | "error" | "critical";
  proposedJE?: unknown; // typed in D6.4
}
