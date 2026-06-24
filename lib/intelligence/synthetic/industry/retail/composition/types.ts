import type {
  RetailPerformancePanelContract,
  RetailPerformancePanelReadParams,
} from "../../../../../dashboard/panels/retail-performance/contract";
import type { ReportingBasis } from "../../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../../standards/contracts/StandardsContracts";
import type { RetailEvaluatorInputs, RetailEvaluatorResult } from "../performance/types";
import type { SyntheticStructuredCommandCenterSurfaceCandidate } from "../../../command-center/surface-candidates";
import type { SyntheticCommandCenterPrioritizationPackage } from "../../../command-center/prioritization";
import type {
  BuildLeaseIntelligenceObservationInput,
  BuildLeaseIntelligenceObservationResult,
} from "../../../audit/lease-intelligence/buildLeaseIntelligenceObservation";
import type {
  ClassifyIsolationReachInput,
  ControlSpineIsolationScope,
  EvaluateRbacAccessInput,
  PanelDataPathHarness,
  PanelDataPathInput,
} from "../../../spine";

export interface RetailSpineSession {
  tenantId: string;
  personaId: string;
  reportingBasis: ReportingBasis;
  subSegment: RetailPerformancePanelReadParams["context"]["subSegment"];
  fiscalCalendar: RetailPerformancePanelReadParams["context"]["fiscalCalendar"];
  forecastInputSource?: string;
}

export type AuthorizeRetailPanelRead = (
  params: RetailPerformancePanelReadParams,
  session: RetailSpineSession,
) => RetailEvaluatorResult<void>;

export type ReadRetailPerformanceInputs = (
  params: RetailPerformancePanelReadParams,
  session: RetailSpineSession,
  reportingFramework: StandardsReportingFramework,
) => Promise<RetailEvaluatorResult<RetailEvaluatorInputs>>;

export type ReadRetailForecastInputs = (
  params: RetailPerformancePanelReadParams,
  session: RetailSpineSession,
  forecastInputSource: string,
  reportingFramework: StandardsReportingFramework,
) => Promise<RetailEvaluatorInputs["forecast"] | null>;

export type BuildRetailPrioritizationPackage = (
  params: RetailPerformancePanelReadParams,
  panel: RetailPerformancePanelContract,
) => SyntheticCommandCenterPrioritizationPackage;

export type BuildLeaseObservation = (
  input: BuildLeaseIntelligenceObservationInput,
) => BuildLeaseIntelligenceObservationResult;

export type ReadLeaseObservationInput = (
  params: RetailPerformancePanelReadParams,
  reportingFramework: StandardsReportingFramework,
) => BuildLeaseIntelligenceObservationInput | null;

export interface RetailSpineDependencies {
  session: RetailSpineSession;
  authorizePanelRead: AuthorizeRetailPanelRead;
  readPerformanceInputs: ReadRetailPerformanceInputs;
  readForecastInputs?: ReadRetailForecastInputs;
  readLeaseObservationInput?: ReadLeaseObservationInput;
  buildPrioritizationPackage: BuildRetailPrioritizationPackage;
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

export interface RetailCommandCenterSurfaceCandidate {
  surfaceCandidate: SyntheticStructuredCommandCenterSurfaceCandidate;
  payload: RetailPerformancePanelContract;
  applicableBasis: ReportingBasis;
}
