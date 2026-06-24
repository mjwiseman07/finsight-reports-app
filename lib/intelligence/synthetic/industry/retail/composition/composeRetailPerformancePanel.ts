import { buildCommandCenterSurfaceCandidate } from "../../../command-center/surface-candidates";
import type { RetailPerformancePanelReadParams } from "../../../../../dashboard/panels/retail-performance/contract";
import { evaluateRetailPerformance } from "../performance/evaluate";
import type { RetailEvaluatorResult } from "../performance/types";
import { authorizeRetailPanelRead } from "./authorizeRetailPanelRead";
import { resolveForecastInputSource } from "./resolveForecastInputSource";
import { resolveReportingFramework } from "./resolveReportingFramework";
import type { RetailCommandCenterSurfaceCandidate, RetailSpineDependencies } from "./types";

export async function composeRetailPerformancePanel(
  params: RetailPerformancePanelReadParams,
  spineDependencies: RetailSpineDependencies,
): Promise<RetailEvaluatorResult<RetailCommandCenterSurfaceCandidate>> {
  const reportingFramework = resolveReportingFramework(params.context.reportingBasis);

  const authorize = spineDependencies.authorizePanelRead ?? authorizeRetailPanelRead;
  const authResult = authorize(params, spineDependencies.session);
  if (!authResult.ok) return authResult;

  const inputsResult = await spineDependencies.readPerformanceInputs(
    params,
    spineDependencies.session,
    reportingFramework,
  );
  if (!inputsResult.ok) return inputsResult;

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
      evaluatorInputs = { ...evaluatorInputs, forecast: forecastInputs };
    }
  }

  const evaluationResult = evaluateRetailPerformance(evaluatorInputs);
  if (!evaluationResult.ok) return evaluationResult;

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
      "Which retail KPIs are trending outside target bands this period?",
      "Are traffic, conversion, and margin aligned for sub-segment performance?",
    ],
    whyNowReasons: [`Retail performance panel updated for ${params.accountingPeriod}.`],
    applicableBasis: [params.context.applicableBasis],
  });

  if (surfaceResult.skipped || !surfaceResult.surfaceCandidate) {
    return { ok: false, error: "SURFACE_CANDIDATE_BUILD_FAILED" };
  }

  return {
    ok: true,
    value: {
      surfaceCandidate: surfaceResult.surfaceCandidate,
      payload: evaluationResult.value,
      applicableBasis: params.context.applicableBasis,
    },
  };
}
