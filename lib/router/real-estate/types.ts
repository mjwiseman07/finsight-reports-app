import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface RealEstateEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildRealEstateEmitterInput(extracted: ExtractedFiling): RealEstateEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function hasRealEstateEntityType(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.entityType === "string";
}

export function hasRealEstateGaapBasis(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.gaapBasis === "string";
}

export function hasRealEstateRevenueRental(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.revenue?.rental === "number";
}

export function hasRealEstateRevenuePropertyCount(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.revenue?.property_count === "number";
}

export function hasLessorLeasesOperating(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.lessor_leases?.operating === "number";
}

export function hasLessorLeasesSalesType(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.lessor_leases?.sales_type === "number";
}

export function hasLessorLeasesDirectFinancing(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.lessor_leases?.direct_financing === "number";
}

export function hasLessorLeasesInput(extracted: ExtractedFiling): boolean {
  const l = extracted.real_estate?.lessor_leases;
  return Boolean(
    l &&
      typeof l.operating === "number" &&
      typeof l.sales_type === "number" &&
      typeof l.direct_financing === "number",
  );
}

export function hasLesseeRouAsset(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.lessee?.rou_asset === "number";
}

export function hasLesseeLeaseLiability(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.lessee?.lease_liability === "number";
}

export function hasLesseeInput(extracted: ExtractedFiling): boolean {
  const l = extracted.real_estate?.lessee;
  return Boolean(l && typeof l.rou_asset === "number" && typeof l.lease_liability === "number");
}

export function hasInvestmentPropertyFairValue(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.investment_property?.fair_value === "number";
}

export function hasInvestmentPropertyCarryingAmount(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.investment_property?.carrying_amount === "number";
}

export function hasInvestmentPropertyInput(extracted: ExtractedFiling): boolean {
  const i = extracted.real_estate?.investment_property;
  return Boolean(i && typeof i.fair_value === "number" && typeof i.carrying_amount === "number");
}

export function hasImpairmentAssetGroup(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.impairment?.asset_group === "string";
}

export function hasImpairmentCarryingAmount(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.impairment?.carrying_amount === "number";
}

export function hasImpairmentFairValue(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.impairment?.fair_value === "number";
}

export function hasImpairmentInput(extracted: ExtractedFiling): boolean {
  const i = extracted.real_estate?.impairment;
  return Boolean(
    i &&
      typeof i.asset_group === "string" &&
      typeof i.carrying_amount === "number" &&
      typeof i.fair_value === "number",
  );
}

export function hasHeldForSaleAssets(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.held_for_sale?.assets === "number";
}

export function hasHeldForSaleLiabilities(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.held_for_sale?.liabilities === "number";
}

export function hasHeldForSaleInput(extracted: ExtractedFiling): boolean {
  const h = extracted.real_estate?.held_for_sale;
  return Boolean(h && typeof h.assets === "number" && typeof h.liabilities === "number");
}

export function hasRealEstateSalesFullAccrual(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.real_estate_sales?.full_accrual === "number";
}

export function hasRealEstateSalesPartialSales(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.real_estate_sales?.partial_sales === "number";
}

export function hasRealEstateSalesInput(extracted: ExtractedFiling): boolean {
  const s = extracted.real_estate?.real_estate_sales;
  return Boolean(s && typeof s.full_accrual === "number" && typeof s.partial_sales === "number");
}

export function hasReitMetricsFfo(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.reit_metrics?.ffo === "number";
}

export function hasReitMetricsAffo(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.reit_metrics?.affo === "number";
}

export function hasReitMetricsNoi(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.reit_metrics?.noi === "number";
}

export function hasReitMetricsInput(extracted: ExtractedFiling): boolean {
  const r = extracted.real_estate?.reit_metrics;
  return Boolean(r && typeof r.ffo === "number" && typeof r.affo === "number" && typeof r.noi === "number");
}

export function hasAcquisitionPropertyName(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.acquisition?.property_name === "string";
}

export function hasAcquisitionAmount(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.acquisition?.amount === "number";
}

export function hasAcquisitionCapRatePct(extracted: ExtractedFiling): boolean {
  return typeof extracted.real_estate?.acquisition?.cap_rate_pct === "number";
}

export function hasAcquisitionInput(extracted: ExtractedFiling): boolean {
  const a = extracted.real_estate?.acquisition;
  return Boolean(
    a &&
      typeof a.property_name === "string" &&
      typeof a.amount === "number" &&
      typeof a.cap_rate_pct === "number",
  );
}

export function isReit(extracted: ExtractedFiling): boolean {
  return extracted.real_estate?.entityType === "REIT";
}

export function isIfrsRealEstate(extracted: ExtractedFiling): boolean {
  return extracted.real_estate?.gaapBasis === "IFRS";
}
