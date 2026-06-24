import type { RetailForecastVarianceSection } from "../../../../../dashboard/panels/retail-performance/contract";
import type { RetailEvaluatorInputs, RetailEvaluatorResult, RetailForecastInputs } from "./types";
import { evaluateAttachRate } from "./attachRate";
import { evaluateAverageOrderValue, evaluateUnitsPerTransaction } from "./basketMetrics";
import { computeSameStoreSalesGrowth } from "./compSales";
import { evaluateOnlineSessions, evaluateCartAbandonmentRate, evaluateDigitalCAC } from "./digitalMetrics";
import { evaluateMarginAndInventory } from "./marginAndInventory";
import { evaluateReturnsRate, evaluateSellThroughRate, evaluateShrinkRate } from "./merchandising";
import { evaluateSalesPerSquareFoot } from "./spaceProductivity";
import { evaluateConversionRate, evaluateTrafficCount } from "./trafficAndConversion";

/** RTL-K-01: (s_c,t - s_c,t-1) / s_c,t-1 * 100 */
export function computeForecastSameStoreSalesGrowth(forecast: RetailForecastInputs): number {
  return computeSameStoreSalesGrowth(
    forecast.operating.comparableSalesCurrent,
    forecast.operating.comparableSalesPrior,
  );
}

export function evaluateForecastVarianceSection(
  inputs: RetailEvaluatorInputs,
): RetailEvaluatorResult<RetailForecastVarianceSection | undefined> {
  if (!inputs.forecast) return { ok: true, value: undefined };

  const context = inputs.context;
  const op = inputs.forecast.operating;
  const margin = evaluateMarginAndInventory(context, inputs.netSalesForPeriod, op.cogs, op.averageInventoryAtCost);
  const attachRate = evaluateAttachRate(context, op.pickupsWithIncrementalPurchase, op.totalPickups);

  return {
    ok: true,
    value: {
      forecastHorizon: inputs.forecast.forecastHorizon,
      forecastInputSource: inputs.forecast.forecastInputSource,
      sameStoreSalesGrowth: {
        id: "RTL-FV-01",
        label: "Forecast Comparable / Same-Store Sales Growth",
        basisOfStandards:
          "NRF comparable-period basis (4-5-4 calendar); comparable-store base requires 12–13 full months of operation (13 months for month-on-month reporting); non-GAAP, company-defined. Sources: nrf.com/resources/4-5-4-calendar.",
        applicableSubSegments: ["B", "E", "O", "G", "S"],
        value: {
          amount: computeSameStoreSalesGrowth(op.comparableSalesCurrent, op.comparableSalesPrior),
          unitOfMeasure: "%",
          signConvention: "higher-better",
        },
      },
      trafficCount: { ...evaluateTrafficCount(context, op.trafficCount), id: "RTL-FV-02" },
      conversionRate: { ...evaluateConversionRate(context, op.transactionsOrOrders, op.trafficOrSessions), id: "RTL-FV-03" },
      averageOrderValue: { ...evaluateAverageOrderValue(context, op.totalRevenue, op.numberOfOrders), id: "RTL-FV-04" },
      unitsPerTransaction: {
        ...evaluateUnitsPerTransaction(context, op.totalUnitsSold, op.numberOfTransactions),
        id: "RTL-FV-05",
      },
      grossMarginPercent: { ...margin.grossMarginPercent, id: "RTL-FV-06" },
      grossMarginROI: { ...margin.grossMarginROI, id: "RTL-FV-07" },
      inventoryTurnover: { ...margin.inventoryTurnover, id: "RTL-FV-08" },
      sellThroughRate: { ...evaluateSellThroughRate(context, op.unitsSold, op.unitsReceived), id: "RTL-FV-09" },
      shrinkRate: {
        ...evaluateShrinkRate(context, op.bookInventory, op.physicalInventory, inputs.netSalesForPeriod),
        id: "RTL-FV-10",
      },
      returnsRate: { ...evaluateReturnsRate(context, op.returnedMerchandise, op.grossSales), id: "RTL-FV-11" },
      attachRate: attachRate ? { ...attachRate, id: "RTL-FV-12" } : undefined,
      salesPerSquareFoot: {
        ...evaluateSalesPerSquareFoot(context, inputs.netSalesForPeriod, op.sellingAreaSqFt),
        id: "RTL-FV-13",
      },
      onlineSessions: { ...evaluateOnlineSessions(context, op.onlineSessions), id: "RTL-FV-14" },
      cartAbandonmentRate: { ...evaluateCartAbandonmentRate(context, op.completedPurchases, op.cartsCreated), id: "RTL-FV-15" },
      digitalCAC: {
        ...evaluateDigitalCAC(context, op.totalSalesAndMarketingSpend, op.newCustomersAcquired),
        id: "RTL-FV-16",
      },
    },
  };
}
