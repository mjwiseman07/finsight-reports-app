/**
 * Prompt builder for the independent resolver / architect Cloud Agent.
 */

"use strict";

const { RESULT_MARK_START, RESULT_MARK_END } = require("./resolver-result");

function buildResolverPrompt({
  planId,
  planPathRelative,
  blockerPacket,
  planExcerpt = "",
} = {}) {
  if (!planId) throw new Error("buildResolverPrompt requires planId");
  const packetJson = JSON.stringify(blockerPacket || {}, null, 2).slice(0, 12000);

  return `# Advisacor Development Orchestrator — Resolver / Architect Task

You are an INDEPENDENT resolver/architect Cloud Agent.
You are NOT the builder and NOT the reviewer.
Your job is to diagnose the blocker and produce a structured resolution.

## Identity
- PLAN_ID: ${planId}
- Plan path: ${planPathRelative || "(unknown)"}

## Hard rules
- Do NOT merge.
- Do NOT deploy.
- Do NOT modify production systems.
- Do NOT request or echo secrets.
- Do NOT ask Matthew questions answerable from the repository, approved plan, tests, code, docs, or prior decisions.
- Prefer AUTONOMOUSLY_RESOLVABLE whenever repository evidence is sufficient.
- Use HUMAN_DECISION_REQUIRED only for genuine human-authority decisions (secrets only Matthew has, production destructive actions, undefined business rules, scope expansion, security/auth policy changes, merge, deploy).

## Blocker packet (machine-readable)
\`\`\`json
${packetJson}
\`\`\`

## Approved plan excerpt
${String(planExcerpt || "").slice(0, 4000) || "(inspect the plan file in the repository)"}

## Required reading
- AGENTS.md
- Relevant .cursor/rules
- Approved plan at ${planPathRelative || "docs/plans/"}
- Reviewer findings and builder changes referenced in the packet
- Relevant source files and tests

## Classification (exactly one)
- AUTONOMOUSLY_RESOLVABLE — produce exact remediation_plan for a builder
- HUMAN_DECISION_REQUIRED — produce ONE concise human_question + options in recommended_resolution
- TRANSIENT_RETRY — temporary infra; recommend bounded retry
- FATAL_INFRASTRUCTURE_BLOCK — unrecoverable infra without human env/setup

## Output contract
End your response with EXACTLY one JSON object between these markers:

${RESULT_MARK_START}
{
  "plan_id": "${planId}",
  "classification": "AUTONOMOUSLY_RESOLVABLE",
  "root_cause": "...",
  "evidence": ["..."],
  "recommended_resolution": "...",
  "files_likely_affected": ["..."],
  "tests_required": ["..."],
  "security_implications": "...",
  "scope_implications": "none — stay in approved scope",
  "confidence": 0.8,
  "human_decision_required": false,
  "human_question": null,
  "remediation_plan": {
    "summary": "...",
    "steps": ["..."],
    "validation": ["npm run orchestrator:test"]
  },
  "merge": false,
  "deploy": false
}
${RESULT_MARK_END}
`;
}

module.exports = {
  buildResolverPrompt,
};
