import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface HospitalityEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildHospitalityEmitterInput(extracted: ExtractedFiling): HospitalityEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function hasRoomsRevenueInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.hospitality?.revenue?.rooms === "number";
}

export function hasLoyaltyProgramInput(extracted: ExtractedFiling): boolean {
  const loyalty = extracted.hospitality?.loyalty_program;
  return Boolean(
    loyalty &&
      typeof loyalty.deferred_revenue === "number" &&
      typeof loyalty.material_right_estimate === "number",
  );
}

export function hasGiftCardsInput(extracted: ExtractedFiling): boolean {
  const giftCards = extracted.hospitality?.gift_cards;
  return Boolean(
    giftCards &&
      typeof giftCards.outstanding === "number" &&
      typeof giftCards.breakage_estimate === "number",
  );
}

export function hasFranchiseFeesInput(extracted: ExtractedFiling): boolean {
  const fees = extracted.hospitality?.franchise_fees;
  return Boolean(fees && typeof fees.initial === "number" && typeof fees.ongoing === "number");
}

export function hasOperatingLeaseMaturityInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.asc842?.maturity?.operating);
}

export function hasCasinoInput(extracted: ExtractedFiling): boolean {
  return typeof extracted.hospitality?.casino?.base_jackpot_accrual === "number";
}

export function hasTimeshareInput(extracted: ExtractedFiling): boolean {
  const timeshare = extracted.hospitality?.timeshare;
  return Boolean(timeshare && typeof timeshare.revenue === "number" && typeof timeshare.deferred === "number");
}

export function hasUsaliInput(extracted: ExtractedFiling): boolean {
  const usali = extracted.hospitality?.usali;
  return Boolean(
    usali &&
      typeof usali.edition === "number" &&
      Array.isArray(usali.departmental_schedules) &&
      usali.departmental_schedules.length > 0,
  );
}

export function isFranchiseOperator(extracted: ExtractedFiling): boolean {
  return extracted.hospitality?.franchiseFlag === true;
}

export function isCasinoOperator(extracted: ExtractedFiling): boolean {
  return extracted.hospitality?.casinoFlag === true;
}

export function isTimeshareOperator(extracted: ExtractedFiling): boolean {
  return extracted.hospitality?.timeshareFlag === true;
}
