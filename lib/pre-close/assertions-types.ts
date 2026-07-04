/**
 * D-Assertions Part 1 — canonical wire and domain types.
 * Part 2 will add close_assertion_coverage projection types.
 */
export const ASSERTION_IDS = [
  "existence_occurrence",
  "completeness",
  "rights_obligations",
  "valuation_allocation",
  "accuracy",
  "cutoff",
  "classification",
  "presentation_disclosure",
] as const;

export type AssertionId = (typeof ASSERTION_IDS)[number];

export const ACCOUNT_CATEGORIES = [
  "cash",
  "accounts_receivable",
  "inventory",
  "fixed_assets",
  "other_current_assets",
  "other_non_current_assets",
  "accounts_payable",
  "accrued_liabilities",
  "other_current_liabilities",
  "long_term_debt",
  "equity",
  "revenue",
  "cost_of_goods_sold",
  "operating_expenses",
  "other_income_expense",
  "tax_expense",
  "off_balance_sheet",
  "disclosure_only",
] as const;

export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];

export type Relevance = "relevant" | "usually_not_primary" | "not_applicable";

export type CoverageStrength = "primary" | "secondary" | "partial";

export type PcaobLegacyCategory =
  | "existence_occurrence"
  | "completeness"
  | "rights_obligations"
  | "valuation_allocation"
  | "presentation_disclosure";

export interface AssertionRow {
  assertion_id: AssertionId;
  display_name: string;
  isa_315_label: string;
  pcaob_legacy_category: PcaobLegacyCategory;
  applies_transaction: boolean;
  applies_balance: boolean;
  description: string;
  authoritative_citation: string;
}

export interface AssertionRelevanceRow {
  account_category: AccountCategory;
  assertion_id: AssertionId;
  relevance: Relevance;
  rationale: string;
  citation: string;
}

export interface RuleAssertionCoverageRow {
  coverage_id: string;
  rule_id: string;
  assertion_id: AssertionId;
  coverage_strength: CoverageStrength;
  account_categories: AccountCategory[];
  rationale: string;
  citation: string;
}

/** Pure helper: is this assertion required for this account category? */
export function isAssertionRelevant(
  matrix: Pick<AssertionRelevanceRow, "account_category" | "assertion_id" | "relevance">[],
  account: AccountCategory,
  assertion: AssertionId,
): boolean {
  const row = matrix.find(
    (r) => r.account_category === account && r.assertion_id === assertion,
  );
  return row?.relevance === "relevant";
}

/** Pure helper: what assertions does rule X cover with what strength? */
export function assertionsForRule(
  coverage: RuleAssertionCoverageRow[],
  ruleId: string,
): Array<{ assertion: AssertionId; strength: CoverageStrength }> {
  return coverage
    .filter((c) => c.rule_id === ruleId)
    .map((c) => ({ assertion: c.assertion_id, strength: c.coverage_strength }));
}
