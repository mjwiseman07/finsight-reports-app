/**
 * Provider-neutral Operating Gross Margin factorizer.
 * Consumes canonical mapped financial summary fields only — never raw ERP rows.
 */
export type OperatingGrossMarginInput = {
  revenue: number;
  grossProfit: number;
  /** Explicit GP row and/or mapped COGS evidence — required for ready. */
  grossProfitSupported: boolean;
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

export const UNAVAILABLE_NO_REVENUE =
  "Operating gross margin is not available because no positive revenue was found for this period.";

export const UNAVAILABLE_NO_GROSS_PROFIT_SUPPORT =
  "Operating gross margin is not available because gross profit could not be reliably determined for this period.";

/**
 * operatingGrossMargin =
 *   revenue > 0 && grossProfitSupported
 *     ? grossProfit / revenue
 *     : unavailable
 *
 * grossProfit must already come from buildMappedFinancialSummary.
 * grossProfitSupported distinguishes true-zero COGS / explicit GP from missing mapping.
 */
export function factorizeOperatingGrossMargin(
  summary: OperatingGrossMarginInput | null | undefined,
): OperatingGrossMarginFactor {
  if (!summary || typeof summary.revenue !== "number" || typeof summary.grossProfit !== "number") {
    return {
      status: "unavailable",
      numeric: null,
      display: null,
      message: UNAVAILABLE_NO_GROSS_PROFIT_SUPPORT,
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

  if (!summary.grossProfitSupported) {
    return {
      status: "unavailable",
      numeric: null,
      display: null,
      message: UNAVAILABLE_NO_GROSS_PROFIT_SUPPORT,
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
