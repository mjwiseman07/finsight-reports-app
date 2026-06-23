import type { ManufacturingForecastInputSource } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../../standards/contracts/StandardsContracts";
import type {
  ManufacturingEvaluatorInputs,
  ManufacturingEvaluatorResult,
  ManufacturingForecastCostInputs,
} from "../variance/types";
import type { ControlSpinePersonaKey, PersonaRbacMatrixContract } from "../../../../../../ops/control-spine/contracts";
import type {
  ClassifyIsolationReachInput,
  ControlSpineIsolationScope,
  EvaluateRbacAccessInput,
  PanelDataPathHarness,
  PanelDataPathInput,
} from "../../../spine";
import type { ManufacturingVariancePanelReadParams } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import type { SyntheticCommandCenterPrioritizationPackage } from "../../../command-center/prioritization";
import type { SyntheticStructuredCommandCenterSurfaceCandidate } from "../../../command-center/surface-candidates";
import type {
  BuildLeaseIntelligenceObservationInput,
  BuildLeaseIntelligenceObservationResult,
} from "../../../audit/lease-intelligence/buildLeaseIntelligenceObservation";
import type { ManufacturingVariancePanelContract } from "../../../../../dashboard/panels/manufacturing-variance/contract";

export interface ManufacturingSpineSession {
  tenantId: string;
  actorReferenceId: string;
  personaKey: ControlSpinePersonaKey;
  personaReferenceId: string;
  rbacMatrix: PersonaRbacMatrixContract;
  retentionConfigurationReferenceId: string;
  evaluationTimestampIso: string;
  /** Tenant-configured forecast feed preference (sop | demand-forecast | sales-pipeline). */
  forecastInputSource?: ManufacturingForecastInputSource;
}

export type AuthorizeManufacturingPanelRead = (
  params: ManufacturingVariancePanelReadParams,
  session: ManufacturingSpineSession,
) => ManufacturingEvaluatorResult<void>;

export type ReadManufacturingVarianceInputs = (
  params: ManufacturingVariancePanelReadParams,
  session: ManufacturingSpineSession,
  reportingFramework: StandardsReportingFramework,
) => Promise<ManufacturingEvaluatorResult<ManufacturingEvaluatorInputs>>;

export type ReadManufacturingForecastInputs = (
  params: ManufacturingVariancePanelReadParams,
  session: ManufacturingSpineSession,
  forecastInputSource: ManufacturingForecastInputSource,
  reportingFramework: StandardsReportingFramework,
) => Promise<ManufacturingForecastCostInputs | null>;

export type BuildManufacturingPrioritizationPackage = (
  params: ManufacturingVariancePanelReadParams,
  panel: ManufacturingVariancePanelContract,
) => SyntheticCommandCenterPrioritizationPackage;

export type BuildLeaseObservation = (
  input: BuildLeaseIntelligenceObservationInput,
) => BuildLeaseIntelligenceObservationResult;

export type ReadLeaseObservationInput = (
  params: ManufacturingVariancePanelReadParams,
  reportingFramework: StandardsReportingFramework,
) => BuildLeaseIntelligenceObservationInput | null;

export interface ManufacturingSpineDependencies {
  session: ManufacturingSpineSession;
  authorizePanelRead: AuthorizeManufacturingPanelRead;
  readVarianceInputs: ReadManufacturingVarianceInputs;
  readForecastInputs?: ReadManufacturingForecastInputs;
  readLeaseObservationInput?: ReadLeaseObservationInput;
  buildPrioritizationPackage: BuildManufacturingPrioritizationPackage;
  buildLeaseObservation?: BuildLeaseObservation;
  evaluateRbacAccess?: (input: EvaluateRbacAccessInput) => ReturnType<
    typeof import("../../../spine").evaluateRbacAccess
  >;
  classifyIsolationReach?: (input: ClassifyIsolationReachInput) => ReturnType<
    typeof import("../../../spine").classifyIsolationReach
  >;
  buildIsolationScopeFromTenantId?: (tenantId: string) => ControlSpineIsolationScope;
  panelDataPathHarness?: PanelDataPathHarness;
  assertPanelTenantScope?: (input: PanelDataPathInput) => ReturnType<PanelDataPathHarness["assertTenantScope"]>;
}

export interface ManufacturingCommandCenterSurfaceCandidate {
  surfaceCandidate: SyntheticStructuredCommandCenterSurfaceCandidate;
  payload: ManufacturingVariancePanelContract;
  applicableBasis: ReportingBasis[];
}

export type CommandCenterSurfaceCandidate = ManufacturingCommandCenterSurfaceCandidate;
