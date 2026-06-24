import type { RetailEvaluatorPanelOutput, RetailEvaluatorInputs, RetailEvaluatorResult } from "./types";
import { assertReportingBasisConsistency } from "./types";
import { evaluateAttachRate } from "./attachRate";
import { evaluateAverageOrderValue, evaluateUnitsPerTransaction } from "./basketMetrics";
import { evaluateCompSales } from "./compSales";
import { evaluateOnlineSessions, evaluateCartAbandonmentRate, evaluateDigitalCAC } from "./digitalMetrics";
import { evaluateForecastVarianceSection } from "./forecast";
import { validateGiftCardRouting } from "./giftCardRouting";
import { authorizeLeaseBasisRoute } from "./leaseGuard";
import { evaluateMarginAndInventory } from "./marginAndInventory";
import { evaluateReturnsRate, evaluateSellThroughRate, evaluateShrinkRate } from "./merchandising";
import { validateLoyaltyRouting } from "./loyaltyRouting";
import { validateReturnsReserve } from "./returnsReserve";
import { validateRimRouting } from "./rimRouting";
import { evaluateSalesPerSquareFoot } from "./spaceProductivity";
import { validateStoreCguRouting } from "./storeCguRouting";
import { evaluateConversionRate, evaluateTrafficCount } from "./trafficAndConversion";

export function evaluateRetailPerformance(
  inputs: RetailEvaluatorInputs,
): RetailEvaluatorResult<RetailEvaluatorPanelOutput> {
  const basisCheck = assertReportingBasisConsistency(
    inputs.context.reportingBasis,
    inputs.context.applicableBasis,
  );
  if (!basisCheck.ok) return basisCheck;

  if (!Number.isFinite(inputs.netSalesForPeriod) || inputs.netSalesForPeriod === 0) {
    return { ok: false, error: "MISSING_NET_SALES" };
  }

  const rim = validateRimRouting(inputs);
  if (!rim.ok) return rim;
  const gift = validateGiftCardRouting(inputs);
  if (!gift.ok) return gift;
  const loyalty = validateLoyaltyRouting(inputs);
  if (!loyalty.ok) return loyalty;
  const storeCgu = validateStoreCguRouting(inputs);
  if (!storeCgu.ok) return storeCgu;
  const lease = authorizeLeaseBasisRoute("ifrs_iasb", "asc842_candidate");
  if (!lease.ok) return lease;

  const compSales = evaluateCompSales(
    inputs.context,
    inputs.operating.comparableSalesCurrent,
    inputs.operating.comparableSalesPrior,
    inputs.compPeriodPair,
  );
  if (!compSales.ok) return compSales;

  const margin = evaluateMarginAndInventory(
    inputs.context,
    inputs.netSalesForPeriod,
    inputs.operating.cogs,
    inputs.operating.averageInventoryAtCost,
  );
  const returnsRate = evaluateReturnsRate(
    inputs.context,
    inputs.operating.returnedMerchandise,
    inputs.operating.grossSales,
  );

  const returnsReserve = validateReturnsReserve(inputs, returnsRate.value.amount);
  if (!returnsReserve.ok) return returnsReserve;

  const forecast = evaluateForecastVarianceSection(inputs);
  if (!forecast.ok) return forecast;

  return {
    ok: true,
    value: {
      companyId: inputs.companyId,
      accountingPeriod: inputs.accountingPeriod,
      context: inputs.context,
      reportingBasis: inputs.context.reportingBasis,
      netSalesForPeriod: inputs.netSalesForPeriod,
      unitOfMeasure: "USD",
      comparableStoreCount: inputs.comparableStoreCount,
      fiscalCalendar: inputs.context.fiscalCalendar,
      sameStoreSalesGrowth: compSales.value,
      trafficCount: evaluateTrafficCount(inputs.context, inputs.operating.trafficCount),
      conversionRate: evaluateConversionRate(
        inputs.context,
        inputs.operating.transactionsOrOrders,
        inputs.operating.trafficOrSessions,
      ),
      averageOrderValue: evaluateAverageOrderValue(
        inputs.context,
        inputs.operating.totalRevenue,
        inputs.operating.numberOfOrders,
      ),
      unitsPerTransaction: evaluateUnitsPerTransaction(
        inputs.context,
        inputs.operating.totalUnitsSold,
        inputs.operating.numberOfTransactions,
      ),
      grossMarginPercent: margin.grossMarginPercent,
      grossMarginROI: margin.grossMarginROI,
      inventoryTurnover: margin.inventoryTurnover,
      sellThroughRate: evaluateSellThroughRate(
        inputs.context,
        inputs.operating.unitsSold,
        inputs.operating.unitsReceived,
      ),
      shrinkRate: evaluateShrinkRate(
        inputs.context,
        inputs.operating.bookInventory,
        inputs.operating.physicalInventory,
        inputs.netSalesForPeriod,
      ),
      returnsRate,
      attachRate: evaluateAttachRate(
        inputs.context,
        inputs.operating.pickupsWithIncrementalPurchase,
        inputs.operating.totalPickups,
      ),
      salesPerSquareFoot: evaluateSalesPerSquareFoot(
        inputs.context,
        inputs.netSalesForPeriod,
        inputs.operating.sellingAreaSqFt,
      ),
      onlineSessions: evaluateOnlineSessions(inputs.context, inputs.operating.onlineSessions),
      cartAbandonmentRate: evaluateCartAbandonmentRate(
        inputs.context,
        inputs.operating.completedPurchases,
        inputs.operating.cartsCreated,
      ),
      digitalCAC: evaluateDigitalCAC(
        inputs.context,
        inputs.operating.totalSalesAndMarketingSpend,
        inputs.operating.newCustomersAcquired,
      ),
      forecastVarianceSection: forecast.value,
      routingDiagnostics: {
        giftCard: gift.value.decision,
        loyalty: loyalty.value.decision,
        returnsReserve: returnsReserve.value.decision,
        storeImpairment: storeCgu.value.decision,
      },
    },
  };
}
