/**
 * Shared types for the rule execution framework (Doc D0).
 * Real rule logic ships in D3–D8; D0 provides the scaffold + stubs.
 */
export type AccountingMethod = "cash" | "accrual" | "modified_cash";
export type RuleSeverity = "info" | "warning" | "error" | "critical";
export type RuleStatus = "pass" | "fail" | "skip" | "error";

/**
 * Minimal QBO client surface available to rules. Wiring lands in later blocks;
 * D0 stubs never touch it, so it is nullable in the context.
 */
export interface QBOClient {
  accessToken: string;
  realmId: string;
  [key: string]: unknown;
}

export interface RuleContext {
  firmClientId: string;
  closePeriodId: string;
  accountingMethod: AccountingMethod;
  memoryService: typeof import("@/lib/memory/client-memory-service");
  qboClient: QBOClient | null;
}

export interface RuleFinding {
  code: string;
  message: string;
  severity: RuleSeverity;
  evidence?: Record<string, unknown>;
}

export interface ProposedAction {
  type: string;
  description: string;
  payload?: Record<string, unknown>;
}

export interface ReviewNote {
  note: string;
  reason?: string;
}

export interface RuleResult {
  ruleId: string;
  status: RuleStatus;
  findings: RuleFinding[];
  proposedActions: ProposedAction[];
  reviewNotes: ReviewNote[];
}

/** A rule module exports a single async execute(). */
export interface RuleModule {
  execute(context: RuleContext): Promise<RuleResult>;
}

export interface ActiveRule {
  ruleId: string;
  ruleName: string;
  ruleCategory: string;
  vertical: string;
  severity: RuleSeverity;
  logicFilePath: string;
  description: string;
  appliesToCashBasis: boolean;
  appliesToAccrualBasis: boolean;
  requiresHistoryMonths: number;
  isEnabled: boolean;
}

export interface RuleExecutionContext {
  qboClient?: QBOClient | null;
  [key: string]: unknown;
}

export interface RuleExecutionResult {
  firmClientId: string;
  closePeriodId: string;
  industryVertical: string;
  accountingMethod: AccountingMethod;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  results: RuleResult[];
  generatedAt: string;
}
