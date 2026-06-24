import type {
  RetailKpiField,
  RetailKpiSignConvention,
  RetailKpiValue,
} from "../../../../../dashboard/panels/retail-performance/contract";
import type { RetailPanelContext, RetailSubSegment } from "../../contracts/retail/RetailBasisContracts";

export const ALL_SUB_SEGMENTS: RetailSubSegment[] = ["B", "E", "O", "G", "S"];

export const BASIS_OF_STANDARDS = {
  "RTL-K-01":
    "NRF comparable-period basis (4-5-4 calendar); comparable-store base requires 12–13 full months of operation (13 months for month-on-month reporting); non-GAAP, company-defined. Sources: nrf.com/resources/4-5-4-calendar.",
  "RTL-K-02":
    "Count of door-counter shopper entries in period (staff excluded). Source: ICSC shopping-center productivity benchmarks.",
  "RTL-K-03":
    "Conversion = (Transactions or Orders) ÷ (Traffic or Sessions) × 100; store and digital conversion are not directly comparable. Source: ICSC; klipfolio.com.",
  "RTL-K-04":
    "AOV = Total Revenue ÷ Number of Orders. Source: shopify.com/blog/average-order-value; klipfolio.com.",
  "RTL-K-05":
    "UPT = Total Units Sold ÷ Number of Transactions; ICSC ticket/basket productivity benchmark. Source: icsc.com America's Marketplace.",
  "RTL-K-06":
    "Gross Margin % = (Net Sales − COGS) ÷ Net Sales × 100; COGS composition governed by FASB ASC 330. Source: dart.deloitte.com ASC 330.",
  "RTL-K-07":
    "GMROI = Gross Margin $ ÷ Average Inventory at Cost; >1.0 profitable, ~3.2 strong. Source: investopedia.com/terms/g/gmroi.asp; shopify.com/retail/gmroi.",
  "RTL-K-08":
    "Inventory Turnover = COGS ÷ Average Inventory at Cost. Source: investopedia.com/terms/g/gmroi.asp; Umbrex GMROI methodology.",
  "RTL-K-09":
    "Sell-through rate (%) = (Units Sold ÷ Units Received) × 100. Source: ismworld.org Monthly Metric; lightspeedhq.com/blog/sell-through-rate.",
  "RTL-K-10":
    "Shrink Rate = (Book Inventory − Physical Inventory) ÷ Net Sales × 100; NRF National Retail Security Survey benchmark. Source: nrf.com/blog/reality-retail-shrink; nrf.com/research/national-retail-security-survey-2023.",
  "RTL-K-11":
    "Return Rate = Returned Merchandise $ (or units) ÷ Gross Sales $ (or units) × 100; NRF/Happy Returns benchmark ~15.8–16.9% overall. Source: nrf.com/research/2025-retail-returns-landscape.",
  "RTL-K-12":
    "Attach Rate = Pickups with Incremental In-Store Purchase ÷ Total Pickups × 100. Source: tulip.com BOPIS; ibm.com/think/topics/bopis-retail.",
  "RTL-K-13":
    "ICSC sales-dollars-per-square-foot productivity metric, measured on Retail Net Leasable Area. Source: icsc.com (2018 leasing course materials; classification standard).",
  "RTL-K-14":
    "Count of distinct site/app sessions in period; session timeout/cross-device rules are platform-defined. Source: klipfolio.com e-commerce KPI library.",
  "RTL-K-15":
    "Abandonment = (1 − Completed Purchases ÷ Carts Created) × 100. Source: klipfolio.com e-commerce KPI library.",
  "RTL-K-16":
    "CAC = Total Sales & Marketing Spend ÷ New Customers Acquired (all S&M, not just media). Source: bdc.ca CLV/CAC; wallstreetprep.com LTV/CAC.",
} as const;

export interface RetailKpiFieldSpec {
  id: keyof typeof BASIS_OF_STANDARDS;
  label: string;
  unitOfMeasure: RetailKpiValue["unitOfMeasure"];
  signConvention: RetailKpiSignConvention;
  applicableSubSegments: RetailSubSegment[];
  computeAmount: () => number;
}

export function buildKpiField(context: RetailPanelContext, spec: RetailKpiFieldSpec): RetailKpiField {
  const applicable = spec.applicableSubSegments.includes(context.subSegment);
  return {
    id: spec.id,
    label: spec.label,
    basisOfStandards: BASIS_OF_STANDARDS[spec.id],
    applicableSubSegments: spec.applicableSubSegments,
    value: {
      amount: applicable ? spec.computeAmount() : 0,
      unitOfMeasure: spec.unitOfMeasure,
      signConvention: spec.signConvention,
    },
  };
}
