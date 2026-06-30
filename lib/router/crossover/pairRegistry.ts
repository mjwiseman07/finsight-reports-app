import type {
  PairCrossoverContext,
  PairCrossoverValidator,
  CrossoverPairCode,
  CrossoverPairDescriptor,
} from "./pairTypes";
import { ALL_PAIRS } from "./pairTypes";
import type { CrossoverValidatorResult } from "./types";
import * as hcNpo from "./pairs/healthcareNonprofit";
import * as reHos from "./pairs/realEstateHospitality";
import * as bankIns from "./pairs/bankingInsurance";
import * as faIns from "./pairs/fundAccountingInsurance";

export const PAIR_VALIDATORS: Record<CrossoverPairCode, readonly PairCrossoverValidator[]> = {
  "hc-npo": [
    hcNpo.validateCharityCareNfpReconciliation,
    hcNpo.validateRevenueSeparation,
    hcNpo.validateNetAssetClassificationOnRestrictedContributions,
    hcNpo.validate990CostReportCrossFoot,
  ],
  "re-hos": [
    reHos.validateReit90HotelInclusion,
    reHos.validateLessorLesseeDuality,
    reHos.validatePropertyImpairmentTrigger,
    reHos.validateHeldForSaleHotelSegmentContinuity,
  ],
  "bank-ins": [
    bankIns.validateCeclScopeConsistency,
    bankIns.validateFfiec051Ifrs17NonComingling,
    bankIns.validateThreeLaneNonComminglingAcrossEntities,
    bankIns.validateCapitalAdequacyNoDoubleCount,
    bankIns.validateEmbeddedDerivativeClassification,
  ],
  "fa-ins": [
    faIns.validateNavReservesReconciliation,
    faIns.validateInvestmentCompanyVsInsuranceElection,
    faIns.validateIlsContractBoundary,
    faIns.validateFairValueHierarchyConsistency,
  ],
} as const;

export function describePair(code: CrossoverPairCode): CrossoverPairDescriptor {
  const d = ALL_PAIRS.find((p) => p.code === code);
  if (!d) throw new Error(`Unknown crossover pair code: ${code}`);
  return d;
}

export function runCrossoverForPair(ctx: PairCrossoverContext): CrossoverValidatorResult[] {
  const validators = PAIR_VALIDATORS[ctx.pair.code];
  return validators.map((v) => v(ctx));
}
