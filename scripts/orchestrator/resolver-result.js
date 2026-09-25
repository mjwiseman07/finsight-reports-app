/**
 * Resolver / architect agent result schema validation and parsing.
 * Fail-closed. Never advances state by itself. Never grants merge/deploy.
 */

"use strict";

const RESOLVER_CLASSIFICATIONS = Object.freeze([
  "AUTONOMOUSLY_RESOLVABLE",
  "HUMAN_DECISION_REQUIRED",
  "TRANSIENT_RETRY",
  "FATAL_INFRASTRUCTURE_BLOCK",
]);

const RESULT_MARK_START = "===ORCHESTRATOR_RESOLVER_RESULT===";
const RESULT_MARK_END = "===END_ORCHESTRATOR_RESOLVER_RESULT===";

function extractResolverResultJson(text) {
  const raw = String(text || "");
  const start = raw.indexOf(RESULT_MARK_START);
  const end = raw.indexOf(RESULT_MARK_END);
  if (start === -1 || end === -1 || end <= start) {
    const fence = raw.match(
      /```(?:json)?\s*(\{[\s\S]*?"classification"[\s\S]*?\})\s*```/i,
    );
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch {
        throw new Error("Malformed resolver JSON in fenced block");
      }
    }
    throw new Error("Resolver result markers not found in agent output");
  }
  const slice = raw.slice(start + RESULT_MARK_START.length, end).trim();
  try {
    return JSON.parse(slice);
  } catch {
    throw new Error("Malformed resolver JSON between result markers");
  }
}

function assertNonEmptyString(value, field, min = 3) {
  if (value == null || String(value).trim().length < min) {
    throw new Error(`Resolver result missing or empty ${field}`);
  }
  return String(value).trim();
}

/**
 * @param {object} result
 * @param {{ expectedPlanId?: string }} [opts]
 */
function assertResolverResultValid(result, { expectedPlanId } = {}) {
  if (result == null || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Resolver result must be a JSON object");
  }

  const planId = result.plan_id || result.planId;
  if (!planId) {
    throw new Error("Resolver result missing plan_id");
  }
  if (expectedPlanId && planId !== expectedPlanId) {
    throw new Error(
      `Resolver plan_id mismatch: ${planId} != ${expectedPlanId}`,
    );
  }

  const classification = String(result.classification || "").toUpperCase();
  if (!RESOLVER_CLASSIFICATIONS.includes(classification)) {
    throw new Error(
      `Unknown resolver classification: ${result.classification} (expected ${RESOLVER_CLASSIFICATIONS.join("|")})`,
    );
  }

  const rootCause = assertNonEmptyString(result.root_cause || result.rootCause, "root_cause");
  const evidence = result.evidence;
  if (evidence == null) {
    throw new Error("Resolver result missing evidence");
  }
  if (typeof evidence === "string" && evidence.trim().length < 3) {
    throw new Error("Resolver result evidence is empty");
  }
  if (Array.isArray(evidence) && evidence.length === 0) {
    throw new Error("Resolver result evidence array is empty");
  }

  const recommendedResolution = assertNonEmptyString(
    result.recommended_resolution || result.recommendedResolution,
    "recommended_resolution",
  );

  const confidenceRaw = result.confidence;
  let confidence = confidenceRaw;
  if (typeof confidenceRaw === "string") {
    const n = Number(confidenceRaw);
    confidence = Number.isFinite(n) ? n : confidenceRaw;
  }
  if (typeof confidence === "number") {
    if (confidence < 0 || confidence > 1) {
      throw new Error("Resolver confidence must be between 0 and 1");
    }
  } else if (typeof confidence === "string") {
    const upper = confidence.toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH"].includes(upper)) {
      throw new Error(
        "Resolver confidence must be 0..1 or LOW|MEDIUM|HIGH",
      );
    }
    confidence = upper;
  } else {
    throw new Error("Resolver result missing confidence");
  }

  const humanDecisionRequired =
    result.human_decision_required === true ||
    result.humanDecisionRequired === true ||
    classification === "HUMAN_DECISION_REQUIRED";

  if (
    classification === "HUMAN_DECISION_REQUIRED" &&
    result.human_decision_required === false
  ) {
    throw new Error(
      "HUMAN_DECISION_REQUIRED classification requires human_decision_required: true",
    );
  }

  if (
    classification === "AUTONOMOUSLY_RESOLVABLE" &&
    humanDecisionRequired === true
  ) {
    throw new Error(
      "AUTONOMOUSLY_RESOLVABLE must not set human_decision_required: true",
    );
  }

  const remediationPlan =
    result.remediation_plan || result.remediationPlan || null;
  if (classification === "AUTONOMOUSLY_RESOLVABLE") {
    if (
      remediationPlan == null ||
      (typeof remediationPlan === "string" &&
        remediationPlan.trim().length < 8) ||
      (typeof remediationPlan === "object" &&
        !Array.isArray(remediationPlan) &&
        Object.keys(remediationPlan).length === 0)
    ) {
      throw new Error(
        "AUTONOMOUSLY_RESOLVABLE requires a non-empty remediation_plan",
      );
    }
  }

  const humanQuestion =
    result.human_question || result.humanQuestion || null;
  if (classification === "HUMAN_DECISION_REQUIRED") {
    if (!humanQuestion || String(humanQuestion).trim().length < 8) {
      throw new Error(
        "HUMAN_DECISION_REQUIRED requires human_question",
      );
    }
  }

  if (result.merge === true || result.deploy === true) {
    throw new Error("Resolver result must not grant merge or deploy authority");
  }

  if (
    result.status === "COMPLETED" ||
    result.set_status === "COMPLETED" ||
    result.classification === "COMPLETED"
  ) {
    throw new Error("Resolver result must not set COMPLETED");
  }

  return {
    plan_id: planId,
    classification,
    root_cause: rootCause,
    evidence,
    recommended_resolution: recommendedResolution,
    files_likely_affected: result.files_likely_affected || result.filesLikelyAffected || [],
    tests_required: result.tests_required || result.testsRequired || [],
    security_implications: result.security_implications || result.securityImplications || null,
    scope_implications: result.scope_implications || result.scopeImplications || null,
    confidence,
    human_decision_required: Boolean(humanDecisionRequired),
    human_question: humanQuestion ? String(humanQuestion).trim() : null,
    remediation_plan: remediationPlan,
    merge: false,
    deploy: false,
  };
}

module.exports = {
  RESOLVER_CLASSIFICATIONS,
  RESULT_MARK_START,
  RESULT_MARK_END,
  extractResolverResultJson,
  assertResolverResultValid,
};
