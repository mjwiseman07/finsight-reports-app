import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticAuditScope } from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export type DefaultIndustryClassification = "generic";

export type DefaultIndustrySubClassification = "generic.default";

export type CompositeScopeKeyForTreatmentScopedMemory =
  "(customerIsolation, framework, industry, industrySubClassification)";

export type PhiDerivationStatus =
  | "containsNoPHI"
  | "derivedFromPHIThroughSafeHarbor"
  | "derivedFromPHIThroughExpertDetermination"
  | "containsPHI";

export type AnalyticMemoryCategory =
  | "fraud_detection"
  | "obvious_error_reasonableness"
  | "fte_to_payroll_consistency"
  | "vendor_duplicate_detection"
  | "structural_anomaly_patterns";

export type AnalyticCategoryList = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
];

export type AnalyticComponentScope = "industry_agnostic" | "industry_scoped";

export type AnalyticCategoryComponentScoping = {
  readonly algorithm: "industry_agnostic";
  readonly baselineParameters: "industry_scoped";
  readonly normalizationRules: "industry_scoped";
};

export type AnalyticCategoriesGranularSplit = {
  fraud_detection: AnalyticCategoryComponentScoping;
  obvious_error_reasonableness: AnalyticCategoryComponentScoping;
  fte_to_payroll_consistency: AnalyticCategoryComponentScoping;
  vendor_duplicate_detection: AnalyticCategoryComponentScoping;
  structural_anomaly_patterns: AnalyticCategoryComponentScoping;
};

export type TreatmentScopedIndustryMemoryCategory =
  | "revenue_recognition_industry_overlay"
  | "reserve_and_allowance_patterns"
  | "industry_specific_cost_accounting"
  | "industry_specific_disclosure_patterns"
  | "industry_specific_reasonableness_application";

export type TreatmentScopedIndustryCategoryList = [
  "revenue_recognition_industry_overlay",
  "reserve_and_allowance_patterns",
  "industry_specific_cost_accounting",
  "industry_specific_disclosure_patterns",
  "industry_specific_reasonableness_application",
];

export interface IndustryMemoryReservationBase {
  boundPhase40SnapshotHash: string;
  boundPhase40_5SnapshotHash: string;
  boundPhase41_5SnapshotHash: string;
  boundPhase39SnapshotHash: string;
  phase42StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  // Fail closed: if PHI sensitivity cannot be determined for the reservation artifact, containsPHI defaults to true.
  containsPHI: boolean;
  // Fail closed: if phiDerivationStatus cannot be determined, default to the most-restrictive applicable value (containsPHI).
  phiDerivationStatus: PhiDerivationStatus;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  warnings: string[];
  skippedIndexes: number[];
}

export interface IndustryDimensionReservation extends IndustryMemoryReservationBase {
  industryClassificationDimensionReserved: true;
  industrySubClassificationDimensionReserved: true;
  defaultIndustry: DefaultIndustryClassification;
  defaultSubClassification: DefaultIndustrySubClassification;
  dimensionsApplyToTreatmentMemoryOnly: true;
  reservedCleanNoRetrofit: true;
  schemaReservationOnly: true;
  writesNoIndustrySpecificMemory: true;
  compositeScopeKeyForTreatmentScopedMemory: CompositeScopeKeyForTreatmentScopedMemory;
  industryAndSubClassificationAreScopingDimensions: true;
  industryIsNotAnIsolationPeer: true;
  isolationPeersUnchanged: true;
  analyticCategories: AnalyticCategoryList;
  analyticCategoriesGranularSplit: AnalyticCategoriesGranularSplit;
  treatmentScopedMemoryCategories: TreatmentScopedIndustryCategoryList;
}

export interface MemoryKeySchemaReservation extends IndustryMemoryReservationBase {
  compositeScopeKeyForTreatmentScopedMemory: CompositeScopeKeyForTreatmentScopedMemory;
  industryAndSubClassificationAreScopingDimensions: true;
  industryIsNotAnIsolationPeer: true;
  isolationPeersUnchanged: true;
  treatmentScopedKeyIncludesIndustryAndSubClassification: true;
  agnosticAlgorithmKeyExcludesIndustry: true;
  scopedComponentKeyIncludesIndustry: true;
  granularSplitDeclaredPerCategory: true;
  frameworkDimensionFrom41_5Preserved: true;
  analyticCategories: AnalyticCategoryList;
  analyticCategoriesGranularSplit: AnalyticCategoriesGranularSplit;
  treatmentScopedMemoryCategories: TreatmentScopedIndustryCategoryList;
}
