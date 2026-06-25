import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticAuditScope } from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export type ReportingFrameworkIdentifier = "us_gaap";

/** GovCon vertical — no IFRS applicability (LOCK-GC-1 / GAP-1). */
export type FrameworkScopedMemoryDimension = ReportingFrameworkIdentifier | "US_GAAP_ONLY";

export type TreatmentScopedMemoryCategory =
  | "revenue_recognition"
  | "lease_accounting"
  | "inventory_measurement"
  | "impairment_measurement"
  | "financial_instruments_measurement";

export type FrameworkAgnosticMemoryCategory =
  | "fraud_detection"
  | "obvious_error_reasonableness"
  | "fte_to_payroll_consistency"
  | "vendor_duplicate_detection"
  | "structural_anomaly_patterns";

export type TreatmentScopedCategoryList = [
  "revenue_recognition",
  "lease_accounting",
  "inventory_measurement",
  "impairment_measurement",
  "financial_instruments_measurement",
];

export type FrameworkAgnosticCategoryList = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
];

export interface StandardsMemoryReservationBase {
  boundPhase40SnapshotHash: string;
  boundPhase40_5SnapshotHash: string;
  boundPhase39SnapshotHash: string;
  phase41_5StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  // Fail closed: if PHI sensitivity cannot be determined for the reservation artifact, containsPHI defaults to true.
  containsPHI: boolean;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  warnings: string[];
  skippedIndexes: number[];
}

export interface FrameworkDimensionReservation extends StandardsMemoryReservationBase {
  reportingFrameworkDimensionReserved: true;
  defaultFramework: "us_gaap";
  dimensionAppliesToTreatmentMemoryOnly: true;
  reservedCleanNoRetrofit: true;
  schemaReservationOnly: true;
  writesNoFrameworkSpecificMemory: true;
  treatmentScopedCategories: TreatmentScopedCategoryList;
  frameworkAgnosticCategories: FrameworkAgnosticCategoryList;
}

export interface MemoryKeySchemaReservation extends StandardsMemoryReservationBase {
  treatmentScopedKeyIncludesFramework: true;
  frameworkAgnosticKeyExcludesFramework: true;
  frameworkDimensionPosition: "reportingFramework is a scoping dimension on treatment-scoped memory keys, not a fourth isolation peer to customerIsolation, firmIsolation, or clientIsolation";
  isolationPeersUnchanged: true;
  treatmentScopedCategories: TreatmentScopedCategoryList;
  frameworkAgnosticCategories: FrameworkAgnosticCategoryList;
}
