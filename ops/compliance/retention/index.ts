/** Barrel export — containsVerticalComplianceLogic: false (retention baseline namespace). */
export {
  RETENTION_BASELINE,
  getBaseline,
  getHipaaDocumentationFloorDays,
  retentionBaselineLookup,
  type RetentionBaselineEntry,
  type RetentionBaselineLookup,
  type RetentionBaselineMarker,
  type RetentionCategory,
} from "./retentionBaseline";

export {
  executeRetentionBaselineFM1BindingTests,
  RETENTION_BASELINE_FM1_BINDING_CASES,
  type RetentionBaselineFM1BindingCase,
  type RetentionBaselineFM1BindingCaseResult,
} from "./retentionBaselineFM1BindingTests";
