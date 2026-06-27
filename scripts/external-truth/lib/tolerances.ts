/**
 * Phase G7-C5.5 — validation tolerance bands (Planning Doc §4 / SAB 99).
 */
export interface ToleranceBands {
  /** SEC SAB 99 default materiality for generic numeric checks. */
  sab99Materiality: number;
  /** Standard percentage band (e.g. 5%). */
  defaultPct: number;
  /** Tight band for COGS / lease PV / cost-to-cost (0.5%). */
  tightPct: number;
  /** Revenue / patient service / category splits (1%). */
  revenuePct: number;
  /** Contract cost / variance / payor mix (2%). */
  contractPct: number;
  /** 990 cross-tie revenue (0.25%). */
  form990Pct: number;
  /** NAV per-share absolute tolerance ($0.01). */
  navAbsolute: number;
  /** Expense ratio basis points (1 bp). */
  expenseRatioBp: number;
}

export const DEFAULT_TOLERANCES: ToleranceBands = {
  sab99Materiality: 0.05,
  defaultPct: 0.05,
  tightPct: 0.005,
  revenuePct: 0.01,
  contractPct: 0.02,
  form990Pct: 0.0025,
  navAbsolute: 0.01,
  expenseRatioBp: 0.0001,
};
