import { buildCommandCenterSurfaceCandidate } from "../../../command-center/surface-candidates";
import { DEFAULT_COMMAND_CENTER_APPLICABLE_BASIS } from "../../../command-center/surface-candidates/buildCommandCenterSurfaceCandidate";
import type { ManufacturingVariancePanelReadParams } from "../../../../../dashboard/panels/manufacturing-variance/contract";
import { evaluateManufacturingVariances } from "../variance/evaluate";
import type { ManufacturingEvaluatorResult } from "../variance/types";
import { authorizeManufacturingPanelRead } from "./authorizeManufacturingPanelRead";
import { resolveForecastInputSource } from "./resolveForecastInputSource";
import { resolveReportingFramework } from "./resolveReportingFramework";
import type {
  CommandCenterSurfaceCandidate,
  ManufacturingSpineDependencies,
} from "./types";

const MANUFACTURING_VARIANCE_SURFACE_BASIS = DEFAULT_COMMAND_CENTER_APPLICABLE_BASIS;

export async function composeManufacturingVariancePanel(
  params: ManufacturingVariancePanelReadParams,
  spineDependencies: ManufacturingSpineDependencies,
): Promise<ManufacturingEvaluatorResult<CommandCenterSurfaceCandidate>> {
  const reportingFramework = resolveReportingFramework(params.context.reportingBasis);

  const authorize =
    spineDependencies.authorizePanelRead ?? authorizeManufacturingPanelRead;
  const authResult = authorize(params, spineDependencies.session);
  if (!authResult.ok) {
    return authResult;
  }

  const inputsResult = await spineDependencies.readVarianceInputs(
    params,
    spineDependencies.session,
    reportingFramework,
  );
  if (!inputsResult.ok) {
    return inputsResult;
  }

  let evaluatorInputs = inputsResult.value;

  const forecastInputSource = resolveForecastInputSource(spineDependencies.session);
  if (forecastInputSource && spineDependencies.readForecastInputs) {
    const forecastInputs = await spineDependencies.readForecastInputs(
      params,
      spineDependencies.session,
      forecastInputSource,
      reportingFramework,
    );
    if (forecastInputs) {
      evaluatorInputs = {
        ...evaluatorInputs,
        forecast: forecastInputs,
      };
    }
  }

  const evaluationResult = evaluateManufacturingVariances(evaluatorInputs);
  if (!evaluationResult.ok) {
    return evaluationResult;
  }

  if (spineDependencies.buildLeaseObservation && spineDependencies.readLeaseObservationInput) {
    const leaseInput = spineDependencies.readLeaseObservationInput(params, reportingFramework);
    if (leaseInput) {
      spineDependencies.buildLeaseObservation({
        ...leaseInput,
        reportingFramework,
      });
    }
  }

  const prioritizationPackage = spineDependencies.buildPrioritizationPackage(
    params,
    evaluationResult.value,
  );

  const surfaceResult = buildCommandCenterSurfaceCandidate({
    prioritizationPackage,
    surfaceArtifactCategory: "industry_item",
    surfacePlacement: "primary_surface",
    consumptionChannels: ["company_surface", "executive_summary"],
    decisionSurfaceCategory: "monitoring",
    surfaceCategory: "controller_command",
    visibleRoleCategories: ["controller", "cfo", "operations"],
    executiveQuestions: [
      "Which manufacturing variances are unfavorable this period?",
      "Are material price or usage variances driving total manufacturing cost?",
    ],
    whyNowReasons: [
      `Manufacturing variance panel updated for ${params.accountingPeriod}.`,
    ],
    applicableBasis: MANUFACTURING_VARIANCE_SURFACE_BASIS,
  });

  if (surfaceResult.skipped || !surfaceResult.surfaceCandidate) {
    return { ok: false, error: "SURFACE_CANDIDATE_BUILD_FAILED" };
  }

  return {
    ok: true,
    value: {
      surfaceCandidate: surfaceResult.surfaceCandidate,
      payload: evaluationResult.value,
      applicableBasis: MANUFACTURING_VARIANCE_SURFACE_BASIS,
    },
  };
}
