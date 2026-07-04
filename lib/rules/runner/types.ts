import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";

export interface RunOptions {
  firmClientId: string;
  trigger: "on_demand" | "scheduled" | "proposal_created" | "recurring_fire_created";
  targetFilter?: { targetType: RuleContext["targetType"]; targetRef: string };
  ruleIdFilter?: string[];
  proposalId?: string; // link fire -> proposal
  recurringFireId?: string; // link fire -> recurring
  closePeriodId?: string; // D6.2a — threaded into RuleContext for period rules
}

export interface LoadedRule {
  rule_id: string;
  rule_version: number;
  vertical: string;
  severity: "info" | "warning" | "error" | "critical";
  applies_to_cash_basis: boolean;
  applies_to_accrual_basis: boolean;
  is_active: boolean;
}

export interface RunSummary {
  runId: string;
  firmClientId: string;
  trigger: RunOptions["trigger"];
  rulesEvaluated: number;
  fires: {
    fired: number;
    suppressed: number;
    error: number;
    not_implemented: number;
  };
  // D6.4c-2: composition outcomes for the fired-with-proposedJE path.
  proposals: {
    composed: number; // review item successfully inserted
    basis_blocked: number; // composer returned basis_blocked
    invalid_draft: number; // composer returned invalid_draft
    composition_error: number; // composer or inserter threw (isolated + audited)
    entitlement_denied: number; // add-on-gated rule fired without entitlement
    no_proposal: number; // rule fired but did not emit proposedJE (flag-only rule)
  };
  durationMs: number;
  killSwitchShortCircuit: boolean;
}

export interface FireInsert {
  firm_client_id: string;
  rule_id: string;
  rule_version: number;
  proposal_id: string | null;
  recurring_fire_id: string | null;
  target_type: RuleContext["targetType"];
  target_ref: string;
  inputs_hash: string;
  outcome: RuleResult["outcome"];
  reason_code: string;
  reason_detail: Record<string, unknown>;
  severity_applied: "info" | "warning" | "error" | "critical";
  memory_record_id: string | null;
}
