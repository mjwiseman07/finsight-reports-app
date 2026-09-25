/**
 * Independent Cloud Agent reviewer prompt builder.
 * Plan file + builder PR remain sources of truth.
 */

"use strict";

function buildReviewerPrompt({
  planId,
  planPathRelative,
  builderPrUrl,
  builderBranch = null,
  builderAgentId = null,
  builderHeadSha = null,
  title = null,
} = {}) {
  if (!planId || !planPathRelative || !builderPrUrl) {
    throw new Error(
      "planId, planPathRelative, and builderPrUrl are required for reviewer prompt",
    );
  }

  const lines = [
    `# Advisacor Development Orchestrator — Independent Review Task`,
    ``,
    `You are an INDEPENDENT reviewer Cloud Agent for Advisacor.`,
    `You did NOT implement this change. Do not assume the builder is correct.`,
    ``,
    `## Identity`,
    `- PLAN_ID: ${planId}`,
    `- Plan path: ${planPathRelative}`,
    title ? `- Title: ${title}` : null,
    `- Builder PR (required review target): ${builderPrUrl}`,
    builderBranch ? `- Builder branch: ${builderBranch}` : null,
    builderAgentId ? `- Builder agent id (must differ from you): ${builderAgentId}` : null,
    builderHeadSha ? `- Expected builder head SHA: ${builderHeadSha}` : null,
    ``,
    `## Required reading`,
    `1. Read root AGENTS.md.`,
    `2. Read applicable .cursor/rules/.`,
    `3. Read docs/agent/REVIEW_AGENT.md and docs/agent/CLOUD_AGENT_REVIEWER.md.`,
    `4. Read the approved plan at ${planPathRelative}.`,
    `5. Verify Plan ID matches exactly: ${planId}.`,
    `6. Inspect the builder PR diff, changed files, commits, and CI notes for:`,
    `   ${builderPrUrl}`,
    ``,
    `## Review checklist (mandatory)`,
    `1. Every acceptance criterion in the plan.`,
    `2. Scope compliance — only approved Scope; respect Out of Scope.`,
    `3. Prohibited Changes were avoided.`,
    `4. Security requirements followed; no secrets in the diff.`,
    `5. Tenant isolation / RLS preserved where applicable.`,
    `6. Validation evidence present / commands run.`,
    `7. No unauthorized production / auth / billing / Stripe / Supabase production changes.`,
    `8. Migrations present if schema changed; otherwise confirm none needed.`,
    `9. Tests not disabled merely to pass.`,
    ``,
    `## Hard constraints`,
    `- Do NOT modify implementation files.`,
    `- Do NOT merge the PR.`,
    `- Do NOT deploy production.`,
    `- Do NOT set plan STATUS to COMPLETED.`,
    `- Do NOT approve by rubber-stamping — fail closed on uncertainty.`,
    `- If Cloud Agent mechanics create an isolated branch, leave implementation untouched.`,
    ``,
    `## Output (required)`,
    `Return exactly one machine-readable JSON object between these markers`,
    `(and nowhere else as the authoritative result):`,
    ``,
    `===ORCHESTRATOR_REVIEW_RESULT===`,
    `{`,
    `  "plan_id": "${planId}",`,
    `  "review_result": "PASS | NEEDS_CHANGES | BLOCKED",`,
    `  "summary": "…",`,
    `  "acceptance_criteria": [{ "criterion": "…", "status": "PASS|FAIL|UNCLEAR", "notes": "…" }],`,
    `  "scope_compliance": { "status": "PASS|FAIL", "notes": "…" },`,
    `  "security_review": { "status": "PASS|FAIL", "notes": "…" },`,
    `  "test_review": { "status": "PASS|FAIL", "notes": "…" },`,
    `  "prohibited_changes_review": { "status": "PASS|FAIL", "notes": "…" },`,
    `  "findings": [`,
    `    {`,
    `      "severity": "LOW|MEDIUM|HIGH|CRITICAL",`,
    `      "requirement": "…",`,
    `      "file": "path/optional",`,
    `      "location": "optional",`,
    `      "explanation": "…",`,
    `      "remediation": "…"`,
    `    }`,
    `  ],`,
    `  "reviewed_pr": "${builderPrUrl}",`,
    `  "reviewed_commit": "<builder head sha>",`,
    `  "reviewed_at": "<ISO-8601>"`,
    `}`,
    `===END_ORCHESTRATOR_REVIEW_RESULT===`,
    ``,
    `Rules for results:`,
    `- PASS: only if all acceptance criteria and security/scope/prohibited checks pass.`,
    `- NEEDS_CHANGES: findings array MUST be non-empty; each finding needs severity, explanation, remediation.`,
    `- BLOCKED: use when review cannot complete safely or a critical blocker exists; findings recommended.`,
    `- review_result must be exactly PASS, NEEDS_CHANGES, or BLOCKED.`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

module.exports = {
  buildReviewerPrompt,
};
