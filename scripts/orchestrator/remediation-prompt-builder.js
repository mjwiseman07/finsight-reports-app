/**
 * Prompt builder for remediation builder Cloud Agents.
 */

"use strict";

function buildRemediationPrompt({
  planId,
  planPathRelative,
  remediationPlan,
  resolverResult = null,
  reviewFindings = [],
  previousAttempts = [],
  prohibitedChanges = "",
} = {}) {
  if (!planId) throw new Error("buildRemediationPrompt requires planId");

  const planText =
    typeof remediationPlan === "string"
      ? remediationPlan
      : JSON.stringify(remediationPlan || {}, null, 2);

  return `# Advisacor Development Orchestrator — Remediation Builder Task

You are a REMEDIATION builder Cloud Agent for PLAN_ID ${planId}.
You are fixing an identified blocker on the EXISTING implementation PR/branch.
Do NOT create a competing unrelated PR. Push fixes to the current PR branch only.

## Plan
- PLAN_ID: ${planId}
- Plan path: ${planPathRelative || "(unknown)"}

## Hard rules
- Fix the identified blocker ONLY.
- Do NOT expand scope beyond the approved plan.
- Do NOT remove or weaken tests to make them pass.
- Do NOT weaken security, auth, or RLS.
- Do NOT modify production systems.
- Do NOT merge.
- Do NOT deploy.
- Do NOT set STATUS: COMPLETED.
- Run required validation before finishing.

## Resolver diagnosis
${resolverResult ? JSON.stringify({
    classification: resolverResult.classification,
    root_cause: resolverResult.root_cause,
    recommended_resolution: resolverResult.recommended_resolution,
    confidence: resolverResult.confidence,
  }, null, 2) : "(see remediation plan)"}

## Exact remediation plan
\`\`\`json
${String(planText).slice(0, 8000)}
\`\`\`

## Reviewer findings
\`\`\`json
${JSON.stringify(reviewFindings || [], null, 2).slice(0, 4000)}
\`\`\`

## Previous attempts
\`\`\`json
${JSON.stringify(previousAttempts || [], null, 2).slice(0, 3000)}
\`\`\`

## Prohibited changes
${String(prohibitedChanges || "See approved plan Prohibited Changes section.").slice(0, 2000)}

## Done criteria
- Blocker fixed on the same PR branch
- Validation commands pass
- Scope unchanged
- No secrets introduced
`;
}

module.exports = {
  buildRemediationPrompt,
};
