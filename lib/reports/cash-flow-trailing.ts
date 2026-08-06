/**
 * Trailing cash-flow / net operating cash flow for scorecard KPIs.
 *
 * Live QBO/Xero providers can fetch a cash-flow statement, but the persisted
 * AdvisacorNormalizedFinancialData model does not store cashFlow rows today
 * (see advisacor-data-model.ts). Until a trailing-NOCF computation ships against
 * real synced data, this helper returns null so the API responds `{ pending: true }`
 * and the Scorecard renders "Refreshing…" — never a fabricated figure.
 */
export type TrailingCashFlowForCompany = {
  netOperatingCashFlow: number;
  monthlyAverageBurn: number;
  lastRefreshedAt: string | null;
};

export async function getTrailingCashFlowForCompany(
  _companyId: string,
): Promise<TrailingCashFlowForCompany | null> {
  return null;
}
