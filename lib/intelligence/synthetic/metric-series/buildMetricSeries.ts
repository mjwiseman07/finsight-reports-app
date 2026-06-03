import { buildConfidenceScore, scoreCompanyMemoryCoverage, scoreDataCompleteness, scoreHistoryCoverage, scoreIndustryProfileCoverage, scoreValidationResult } from "../confidence-scoring";
import { buildCalculationStep, buildCalculationTrace, buildEvidenceRecord, buildEvidenceSourceRef } from "../evidence-store";
import type { SyntheticMetricSeries } from "../types/metric-series";
import { buildMetricSeriesPoint } from "./buildMetricSeriesPoint";
import { resolveMetricSeriesCoverage } from "./resolveMetricSeriesInputs";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildMetricSeries(input: SyntheticMetricSeriesBuilderInput): SyntheticMetricSeries {
  const evidenceRecords = input.values.map((value, index) => {
    const evidenceId = `${input.metricKey}:evidence:${index}`;
    return buildEvidenceRecord({
      id: evidenceId,
      companyId: input.snapshotSeries.companyId,
      moduleKey: "metric_series",
      evidenceType: "metric_value",
      sourceRefs: [
        buildEvidenceSourceRef({
          snapshotId: value.snapshotId,
          sourceSystem: value.sourceSystem || input.snapshotSeries.sourceSystem,
          sourceReport: value.sourceReport,
        }),
      ],
      metrics: [{ metricKey: input.metricKey, label: input.label, value: value.value, unit: input.kpiDefinition.output.unit, period: value.period.label || value.period.endDate }],
      qualityFlags: value.qualityFlags || [],
      createdAt: input.createdAt,
    });
  });
  const evidenceIds = evidenceRecords.map((record) => record.id);
  const traceId = `${input.metricKey}:trace`;
  const trace = buildCalculationTrace({
    id: traceId,
    moduleKey: "metric_series",
    metricKey: input.metricKey,
    steps: [
      buildCalculationStep({
        stepId: `${input.metricKey}:resolve_inputs`,
        label: "Resolve metric series inputs",
        formulaRef: input.formulaRegistryEntry.definition.formulaKey,
        inputs: input.values.map((value, index) => ({ key: `${input.metricKey}:${index}`, value: value.value, evidenceId: evidenceIds[index] })),
        outputs: [{ key: input.metricKey, value: input.values.length, unit: "count" }],
      }),
    ],
    evidenceIds,
    createdAt: input.createdAt,
  });
  const coverage = resolveMetricSeriesCoverage(input);
  const validationWarningCount = input.snapshotSeries.snapshots.reduce((total, snapshot) => total + snapshot.validationWarnings.length, 0);
  const confidence = buildConfidenceScore({
    factors: [
      ...scoreHistoryCoverage(input.snapshotSeries),
      ...scoreDataCompleteness({
        hasCoreStatements: input.snapshotSeries.coverage.hasBalanceSheet && input.snapshotSeries.coverage.hasIncomeStatement,
        hasCashFlow: input.hasCashFlow ?? input.snapshotSeries.coverage.hasCashFlow,
        missingRequiredEvidence: input.missingRequiredEvidence,
        missingOptionalSchedules: input.missingOptionalSchedules,
      }),
      ...scoreValidationResult({
        readyForReporting: input.snapshotSeries.snapshots.every((snapshot) => snapshot.validationReadyForReporting),
        warningCount: validationWarningCount,
      }),
      ...scoreIndustryProfileCoverage({ profile: input.industryProfile, metricKey: input.metricKey, benchmarkAvailable: Boolean(input.industryProfile) }),
      ...scoreCompanyMemoryCoverage(input.companyMemory || []),
    ],
    inputSummary: {
      monthsOfHistory: input.snapshotSeries.coverage.availableMonths,
      dataCompletenessScore: coverage.requestedPeriods ? coverage.availablePeriods / coverage.requestedPeriods : 0,
      validationWarningCount,
      industryCoverageAvailable: Boolean(input.industryProfile),
      requiredEvidenceAvailable: !input.missingRequiredEvidence,
    },
  });
  return {
    metricKey: input.metricKey,
    label: input.label,
    unit: input.kpiDefinition.output.unit,
    points: input.values.map((value, index) => buildMetricSeriesPoint({ ...value, evidenceId: evidenceIds[index], calculationTraceId: trace.id })),
    coverage,
    confidence,
    evidenceIds,
    calculationTraceIds: [trace.id],
    kpiKey: input.kpiDefinition.kpiKey,
    formulaKey: input.formulaRegistryEntry.definition.formulaKey,
    parentMetricIds: input.parentMetricIds || [],
    sourceMetricIds: input.sourceMetricIds || [],
  };
}
