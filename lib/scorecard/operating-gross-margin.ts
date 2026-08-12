/**
 * Provider-neutral Operating Gross Margin factorizer.
 * Consumes canonical mapped financial summary fields only — never raw ERP rows.
 */
export type OperatingGrossMarginInput = {
  revenue: number;
  grossProfit: number;
};

export type OperatingGrossMarginFactor = {
  status: "ready" | "unavailable";
  numeric: number | null;
  display: string | null;
  message?: string;
  formula: string | null;
};

const PERCENT_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const UNAVAILABLE_NO_REVENUE =
  "Operating gross margin is not available because no positive revenue was found for this period.";

/**
 * operatingGrossMargin = revenue > 0 ? grossProfit / revenue : unavailable
 * grossProfit must already come from buildMappedFinancialSummary.
 */
export function factorizeOperatingGrossMargin(
  summary: OperatingGrossMarginInput | null | undefined,
): OperatingGrossMarginFactor {
  if (!summary || typeof summary.revenue !== "number" || typeof summary.grossProfit !== "number") {
    return {
      status: "unavailable",
      numeric: null,
      display: null,
      message: UNAVAILABLE_NO_REVENUE,
      formula: null,
    };
  }

  if (!(summary.revenue > 0)) {
    return {
      status: "unavailable",
      numeric: null,
      display: null,
      message: UNAVAILABLE_NO_REVENUE,
      formula: null,
    };
  }

  const ratio = summary.grossProfit / summary.revenue;
  return {
    status: "ready",
    numeric: ratio,
    display: PERCENT_FORMAT.format(ratio),
    formula: "grossProfit / revenue",
  };
}
