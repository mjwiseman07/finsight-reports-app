/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const root = process.cwd();
const memory = require("../lib/intelligence/synthetic/company-memory/index.ts");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

const requiredExports = [
  "buildAdvisorFeedback",
  "buildCompanyMemoryRecord",
  "buildEntityAlias",
  "buildMemoryLineage",
  "buildRecommendationOutcome",
  "buildThresholdOverride",
  "scoreMemoryConfidence",
  "scoreMemoryFreshness",
  "stableMemoryHash",
  "validateCompanyMemoryRecord",
];

for (const exportName of requiredExports) {
  assert(memory[exportName] !== undefined, `${exportName} exists and is exported`);
}

const recurringObservedPeriods = [
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
];

const arFreshness = memory.scoreMemoryFreshness({
  observedPeriodKeys: recurringObservedPeriods,
  memoryLastConfirmedAt: "2026-11",
  asOfPeriodKey: "2026-12",
});
const oldInventoryFreshness = memory.scoreMemoryFreshness({
  observedPeriodKeys: ["2022-12"],
  memoryLastConfirmedAt: "2022-12",
  asOfPeriodKey: "2026-12",
});

assert(arFreshness.memoryFreshnessScore > 0.9, "Recent recurring AR memory receives high freshness");
assert(oldInventoryFreshness.memoryFreshnessScore < 0.25, "Old single inventory memory receives low freshness");
assert(arFreshness.freshnessExplanationCodes.includes("confirmed_within_12_months"), "Freshness includes recent confirmation code");
assert(oldInventoryFreshness.freshnessExplanationCodes.includes("stale_more_than_24_months"), "Freshness includes stale memory code");

const advisorConfidence = memory.scoreMemoryConfidence({
  observedPeriodCount: 24,
  sourceRefCount: 3,
  memoryFreshnessScore: arFreshness.memoryFreshnessScore,
  memorySourceAuthority: "advisor",
  advisorConfirmed: true,
  hasSnapshotEvidence: true,
});
const systemConfidence = memory.scoreMemoryConfidence({
  observedPeriodCount: 1,
  sourceRefCount: 1,
  memoryFreshnessScore: oldInventoryFreshness.memoryFreshnessScore,
  memorySourceAuthority: "system_observation",
  hasSnapshotEvidence: true,
});

assert(advisorConfidence.score > systemConfidence.score, "Advisor-confirmed memory scores higher than single system observation");
assert(advisorConfidence.explanationCodes.includes("authority_advisor"), "Confidence records advisor authority code");
assert(systemConfidence.explanationCodes.includes("authority_system_observation"), "Confidence records system authority code");

const advisorFeedback = memory.buildAdvisorFeedback({
  recommendationId: "rec_reduce_ar",
  signalId: "signal_ar_collection_risk",
  feedbackStatus: "accepted",
  feedbackSource: "advisor",
  feedbackText: "Advisor confirmed this AR issue recurs seasonally.",
  reviewedBy: "advisor-1",
  reviewDate: "2026-12-15",
  sourceRefs: [{ sourceType: "advisor", sourceId: "advisor-note-1", observedPeriodKey: "2026-12" }],
});

const recommendationOutcome = memory.buildRecommendationOutcome({
  recommendationId: "rec_reduce_ar",
  outcomeStatus: "successful",
  outcomeMetrics: [{ metricId: "dso", beforeValue: 52, afterValue: 41, delta: -11, periodStart: "2026-09", periodEnd: "2026-12", direction: "improved" }],
  outcomeEvidence: [
    { sourceType: "historical_snapshot", sourceId: "snapshot-2026-09", observedPeriodKey: "2026-09" },
    { sourceType: "historical_snapshot", sourceId: "snapshot-2026-12", observedPeriodKey: "2026-12" },
  ],
  reviewedBy: "advisor-1",
  reviewDate: "2026-12-15",
});

assert(recommendationOutcome.recommendationId === "rec_reduce_ar", "Recommendation outcome preserves recommendation ID");
assert(recommendationOutcome.outcomeStatus === "successful", "Recommendation outcome tracks successful status");
assert(recommendationOutcome.outcomeMetrics[0].metricId === "dso", "Recommendation outcome tracks outcome metrics");
assert(advisorFeedback.feedbackStatus === "accepted", "Advisor feedback tracks accepted status");

const aliasConfidence = memory.scoreMemoryConfidence({
  observedPeriodCount: 12,
  sourceRefCount: 2,
  memoryFreshnessScore: 0.72,
  memorySourceAuthority: "historical_snapshot",
  hasSnapshotEvidence: true,
});
const entityAlias = memory.buildEntityAlias({
  entityType: "customer",
  canonicalName: "Acme Health",
  aliases: ["ACME Health LLC", "Acme Health", "ACME HEALTH LLC"],
  firstObservedPeriod: "2026-01",
  lastObservedPeriod: "2026-12",
  sourceRefs: [{ sourceType: "historical_snapshot", sourceId: "snapshot-2026-12", observedPeriodKey: "2026-12" }],
  confidence: aliasConfidence,
});

assert(entityAlias.aliases.length === 3, "Entity alias preserves unique aliases");
assert(entityAlias.entityType === "customer", "Entity alias tracks customer type");

const thresholdOverride = memory.buildThresholdOverride({
  industryProfileId: "healthcare",
  industryProfileVersion: "1.0.0",
  thresholdKey: "dso_high",
  metricKey: "dso",
  operator: "greater_than",
  overrideValue: 50,
  overrideReasonCode: "payer_mix_extends_collection_cycle",
  approvedBy: "advisor-1",
  approvedAt: "2026-12-15",
  effectiveDate: "2027-01-01",
  sourceRefs: [{ sourceType: "advisor", sourceId: "threshold-approval-1", observedPeriodKey: "2026-12" }],
});

assert(thresholdOverride.industryProfileId === "healthcare", "Threshold override references industry profile");
assert(thresholdOverride.overrideValue === 50, "Threshold override preserves company-specific value");

const lineage = memory.buildMemoryLineage({
  memoryId: "pending",
  recommendationIds: ["rec_reduce_ar"],
  signalIds: ["signal_ar_collection_risk"],
  metricIds: ["dso"],
  evidenceIds: ["evidence_ar_aging"],
  snapshotIds: ["snapshot-2026-09", "snapshot-2026-12"],
  industryProfileId: "healthcare",
  industryProfileVersion: "1.0.0",
  advisorFeedbackIds: [advisorFeedback.feedbackId],
  recommendationOutcomeIds: [recommendationOutcome.outcomeId],
});

const recordInput = {
  companyId: "company-1",
  memoryType: "recurring_pattern",
  memorySourceAuthority: "advisor",
  sourceRefs: [
    { sourceType: "historical_snapshot", sourceId: "snapshot-2026-09", observedPeriodKey: "2026-09" },
    { sourceType: "historical_snapshot", sourceId: "snapshot-2026-12", observedPeriodKey: "2026-12" },
    { sourceType: "advisor", sourceId: "advisor-note-1", observedPeriodKey: "2026-12" },
  ],
  createdAt: "2026-12-15T00:00:00.000Z",
  asOfPeriodKey: "2026-12",
  observedPeriodKeys: recurringObservedPeriods,
  memoryLastConfirmedAt: "2026-11",
  memoryLineage: {
    recommendationIds: lineage.recommendationIds,
    signalIds: lineage.signalIds,
    metricIds: lineage.metricIds,
    evidenceIds: lineage.evidenceIds,
    snapshotIds: lineage.snapshotIds,
    industryProfileId: lineage.industryProfileId,
    industryProfileVersion: lineage.industryProfileVersion,
    advisorFeedbackIds: lineage.advisorFeedbackIds,
    recommendationOutcomeIds: lineage.recommendationOutcomeIds,
  },
  recurringPattern: {
    patternKey: "recurring_ar_collection_risk",
    description: "AR collection risk has recurred for this company.",
    recurrenceCount: 24,
    observedPeriodKeys: recurringObservedPeriods,
    periodCadence: "monthly",
    affectedMetricIds: ["dso"],
    evidenceIds: ["evidence_ar_aging"],
    snapshotIds: ["snapshot-2026-09", "snapshot-2026-12"],
  },
};

const companyMemoryRecord = memory.buildCompanyMemoryRecord(recordInput);
const repeatedCompanyMemoryRecord = memory.buildCompanyMemoryRecord(recordInput);
assert(companyMemoryRecord.memoryId === repeatedCompanyMemoryRecord.memoryId, "Memory record ID is deterministic");
assert(companyMemoryRecord.memoryLineage.memoryId === companyMemoryRecord.memoryId, "Memory lineage points to memory ID");
assert(companyMemoryRecord.memoryLineage.recommendationIds.includes("rec_reduce_ar"), "Memory lineage preserves recommendation");
assert(companyMemoryRecord.memoryLineage.signalIds.includes("signal_ar_collection_risk"), "Memory lineage preserves signal");
assert(companyMemoryRecord.memoryLineage.metricIds.includes("dso"), "Memory lineage preserves metric");
assert(companyMemoryRecord.memoryLineage.evidenceIds.includes("evidence_ar_aging"), "Memory lineage preserves evidence");
assert(companyMemoryRecord.memoryLineage.snapshotIds.includes("snapshot-2026-12"), "Memory lineage preserves snapshot");
assert(companyMemoryRecord.memoryAudit.memoryFreshnessScore === companyMemoryRecord.memoryFreshnessScore, "Memory audit preserves freshness score");
assert(companyMemoryRecord.memoryAudit.memorySourceAuthority === "advisor", "Memory audit preserves source authority");

const validation = memory.validateCompanyMemoryRecord(companyMemoryRecord);
assert(validation.valid, `Company memory record validates: ${validation.errors.join(",")}`);

const thresholdMemoryRecord = memory.buildCompanyMemoryRecord({
  companyId: "company-1",
  memoryType: "threshold_override",
  memorySourceAuthority: "review_workflow",
  sourceRefs: thresholdOverride.sourceRefs,
  createdAt: "2026-12-15T00:00:00.000Z",
  asOfPeriodKey: "2026-12",
  memoryLineage: {
    recommendationIds: [],
    signalIds: [],
    metricIds: ["dso"],
    evidenceIds: [],
    snapshotIds: [],
    industryProfileId: "healthcare",
    industryProfileVersion: "1.0.0",
  },
  thresholdOverride,
});
assert(memory.validateCompanyMemoryRecord(thresholdMemoryRecord).valid, "Threshold override memory validates");

const sourceRoot = path.join(root, "lib", "intelligence", "synthetic", "company-memory");
const sourceText = fs.readdirSync(sourceRoot)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(sourceRoot, file), "utf8"))
  .join("\n");

const forbiddenPatterns = [
  /from\s+["'][^"']*app\/dashboard/i,
  /from\s+["'][^"']*financial-package-pdf/i,
  /from\s+["'][^"']*powerpoint/i,
  /from\s+["'][^"']*pulse/i,
  /from\s+["'][^"']*package-ui/i,
  /from\s+["'][^"']*lib\/integrations/i,
  /from\s+["'][^"']*report-preflight/i,
  /supabase|createClient|migration|from\s+["'][^"']*\/route/i,
  /openai|@ai-sdk|langchain|anthropic|chat memory|AI memory|fetch\s*\(|axios|XMLHttpRequest/i,
  /forecast|budget|dashboard wiring|pdf wiring|powerpoint wiring/i,
];

for (const pattern of forbiddenPatterns) {
  assert(!pattern.test(sourceText), `Forbidden persistence/output/provider/API pattern absent: ${pattern}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nCompany memory verification passed.");
