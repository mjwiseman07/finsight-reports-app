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
const persistence = require("../lib/intelligence/synthetic/explanation-persistence/index.ts");

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
  "buildStoredExplanationRecord",
  "buildReviewQueueItem",
  "buildReviewDecision",
  "buildApprovalWorkflowRecord",
  "resolveReviewPriority",
  "resolveReviewRiskCategory",
];

for (const exportName of requiredExports) {
  assert(typeof persistence[exportName] === "function", `${exportName} exists and is exported`);
}

const explanation = {
  explanationId: "explanation-1",
  recommendationId: "working_capital_liquidity_review:cash_pressure",
  recommendationType: "working_capital_liquidity_review",
  claimType: "working_capital_liquidity_review",
  languageCategory: "risk",
  actionType: "review",
  confidenceScore: 0.82,
  confidenceTier: "high",
  explanationConfidence: "high",
  explanationSummary: "The explanation is bounded by the existing recommendation and evidence.",
  keyDrivers: ["Cash and AR signals share the same working capital pressure group."],
  evidenceCitations: [{ citationId: "evidence-cash", sourceType: "evidence", sourceId: "evidence-cash" }],
  limitationCodes: [],
  sourceSignalIds: ["cash_pressure:cash:may-2026", "ar_collection_risk:ar:may-2026"],
  sourceMetricIds: ["cash", "ar"],
  evidenceIds: ["evidence-cash", "evidence-ar"],
  calculationTraceIds: ["trace-cash", "trace-ar"],
  rootCauseSignalIds: ["ar_collection_risk:ar:may-2026"],
  correlationGroupId: "working_capital_pressure",
  recommendationLineageId: "working_capital_liquidity_review:cash_pressure",
  explanationLineage: {
    explanationId: "explanation-1",
    recommendationId: "working_capital_liquidity_review:cash_pressure",
    sourceSignalIds: ["cash_pressure:cash:may-2026", "ar_collection_risk:ar:may-2026"],
    sourceMetricIds: ["cash", "ar"],
    evidenceIds: ["evidence-cash", "evidence-ar"],
    calculationTraceIds: ["trace-cash", "trace-ar"],
    correlationGroupId: "working_capital_pressure",
  },
  explanationGuardrailResult: {
    status: "passed",
    passedChecks: ["known_citations_only"],
    failedChecks: [],
    blockedClaims: [],
  },
  guardrailChecks: [{ code: "known_citations_only", passed: true }],
  createdAt: "2026-06-01T00:00:00.000Z",
};

const stored = persistence.buildStoredExplanationRecord({
  storedExplanationId: "stored-explanation-1",
  explanationObject: explanation,
  storageStatus: "queued_for_review",
  createdAt: "2026-06-01T00:00:00.000Z",
});

assert(stored.explanationObject === explanation, "Stored record preserves explanation object without mutation");
assert(stored.explanationLineageSnapshot.explanationId === explanation.explanationId, "Stored record freezes explanation lineage snapshot");
assert(stored.explanationGuardrailResult.status === "passed", "Stored record preserves guardrail result");
assert(stored.confidenceScore === explanation.confidenceScore && stored.confidenceTier === explanation.confidenceTier, "Stored record preserves confidence score and tier");

const queueItem = persistence.buildReviewQueueItem({
  queueItemId: "queue-item-1",
  storedExplanationRecord: stored,
  requiredReviewerRole: "cpa",
  createdAt: "2026-06-01T00:00:00.000Z",
});

assert(queueItem.storedExplanationId === stored.storedExplanationId, "Queue item is derived from stored explanation record");
assert(queueItem.priority === "high", "Working capital liquidity review gets deterministic high priority");
assert(queueItem.reviewRiskCategory === "working_capital", "Queue item preserves deterministic review risk category");
assert(queueItem.guardrailStatus === "passed", "Queue item preserves guardrail status");

const cpaDecision = persistence.buildReviewDecision({
  decisionId: "decision-cpa-1",
  queueItemId: queueItem.queueItemId,
  storedExplanationId: stored.storedExplanationId,
  decision: "approved",
  reviewerId: "reviewer-cpa",
  reviewerRole: "cpa",
  decisionReasonCodes: ["lineage_verified"],
  createdAt: "2026-06-01T01:00:00.000Z",
});
const advisorDecision = persistence.buildReviewDecision({
  decisionId: "decision-advisor-1",
  queueItemId: queueItem.queueItemId,
  storedExplanationId: stored.storedExplanationId,
  decision: "approved",
  reviewerId: "reviewer-advisor",
  reviewerRole: "advisor",
  decisionReasonCodes: ["client_ready"],
  createdAt: "2026-06-01T02:00:00.000Z",
});
const complianceDecision = persistence.buildReviewDecision({
  decisionId: "decision-compliance-1",
  queueItemId: queueItem.queueItemId,
  storedExplanationId: stored.storedExplanationId,
  decision: "approved",
  reviewerId: "reviewer-compliance",
  reviewerRole: "compliance",
  decisionReasonCodes: ["guardrails_passed"],
  createdAt: "2026-06-01T03:00:00.000Z",
});

const workflow = persistence.buildApprovalWorkflowRecord({
  workflowRecordId: "workflow-1",
  storedExplanationRecord: stored,
  queueItemId: queueItem.queueItemId,
  decisionHistory: [cpaDecision, advisorDecision, complianceDecision],
  createdAt: "2026-06-01T00:30:00.000Z",
  updatedAt: "2026-06-01T03:00:00.000Z",
});

assert(workflow.currentStatus === "approved", "Workflow status follows latest review decision");
assert(workflow.latestDecision.decisionId === complianceDecision.decisionId, "Workflow preserves latest decision");
assert(workflow.decisionHistory.length === 3, "Workflow preserves full decision history");
assert(workflow.explanationLineageSnapshot.explanationId === explanation.explanationId, "Workflow preserves immutable explanation lineage snapshot");
assert(workflow.reviewLineage.workflowRecordId === "workflow-1", "Workflow includes reviewLineage");
assert(workflow.reviewLineage.latestDecisionId === complianceDecision.decisionId, "reviewLineage points to latest decision");
assert(workflow.reviewLineage.storedExplanationId === stored.storedExplanationId, "reviewLineage points to stored explanation");
assert(workflow.reviewLineage.sourceSignalIds.includes("cash_pressure:cash:may-2026"), "reviewLineage preserves source signals");
assert(workflow.reviewLineage.sourceMetricIds.includes("cash"), "reviewLineage preserves source metrics");
assert(workflow.reviewLineage.evidenceIds.includes("evidence-ar"), "reviewLineage preserves evidence IDs");
assert(workflow.reviewLineage.calculationTraceIds.includes("trace-ar"), "reviewLineage preserves trace IDs");
assert(workflow.reviewRiskCategory === queueItem.reviewRiskCategory, "Workflow preserves reviewRiskCategory");

const failedGuardrailStored = persistence.buildStoredExplanationRecord({
  storedExplanationId: "stored-failed-guardrail",
  explanationObject: {
    ...explanation,
    explanationId: "explanation-failed",
    explanationConfidence: "low",
    explanationGuardrailResult: {
      status: "failed",
      passedChecks: [],
      failedChecks: ["no_forecasts"],
      blockedClaims: ["attempted_unsupported_forecast_statement"],
    },
  },
  createdAt: "2026-06-01T00:00:00.000Z",
});
assert(persistence.resolveReviewPriority(failedGuardrailStored) === "critical", "Failed guardrails increase queue priority deterministically");
assert(persistence.resolveReviewRiskCategory(failedGuardrailStored) === "compliance", "Failed guardrails route to compliance risk category");

const persistenceDir = path.join(root, "lib", "intelligence", "synthetic", "explanation-persistence");
const sourceText = fs.readdirSync(persistenceDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => fs.readFileSync(path.join(persistenceDir, file), "utf8"))
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
  /openai|@ai-sdk|langchain|anthropic|fetch\s*\(|axios|XMLHttpRequest/i,
  /forecast|budget|scenario|ROI|what-if|kpi\s+calculation|financial\s+calculation/i,
];

for (const pattern of forbiddenPatterns) {
  assert(!pattern.test(sourceText), `Forbidden runtime/output/database/API pattern absent: ${pattern}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI explanation persistence verification passed.");
