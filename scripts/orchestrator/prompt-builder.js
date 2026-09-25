/**
 * Build the Cloud Agent implementation prompt from an approved plan.
 * The plan file in the repository remains the source of truth —
 * this prompt points the agent at that file rather than embedding it wholesale.
 */

"use strict";

function buildImplementationPrompt({
  planId,
  planPathRelative,
  title = null,
  objective = null,
} = {}) {
  if (!planId || !planPathRelative) {
    throw new Error("planId and planPathRelative are required to build prompt");
  }

  const lines = [
    `# Advisacor Development Orchestrator — Implementation Task`,
    ``,
    `You are the implementation (builder) Cloud Agent for Advisacor.`,
    ``,
    `## Plan identity`,
    `- PLAN_ID: ${planId}`,
    `- Plan path (repository-relative): ${planPathRelative}`,
    title ? `- Title: ${title}` : null,
    objective ? `- Objective (summary only): ${String(objective).slice(0, 400)}` : null,
    ``,
    `## Required reading (in order)`,
    `1. Read root AGENTS.md.`,
    `2. Read applicable rules under .cursor/rules/.`,
    `3. Read docs/agent/IMPLEMENTATION_AGENT.md.`,
    `4. Read the approved plan file at ${planPathRelative}.`,
    `5. Verify the Plan ID in the file matches exactly: ${planId}.`,
    `6. Verify the plan STATUS line is exactly: STATUS: APPROVED_FOR_IMPLEMENTATION.`,
    `   If STATUS is anything else, STOP and report the mismatch. Do not implement.`,
    ``,
    `## Implementation rules`,
    `1. Implement ONLY the approved Scope in the plan.`,
    `2. Respect Out of Scope and Prohibited Changes.`,
    `3. Avoid unrelated refactoring or drive-by cleanups.`,
    `4. Follow Security Requirements in the plan and .cursor/rules/security.mdc.`,
    `5. Preserve tenant isolation and Supabase RLS — never weaken them.`,
    `6. Execute ALL Validation Commands listed in the plan.`,
    `7. Fix failures introduced by your implementation.`,
    `8. Never disable tests or lint rules merely to pass.`,
    `9. Never modify production systems (Supabase production, Stripe production, live deploy).`,
    `10. Never merge to main.`,
    `11. Never set plan STATUS to COMPLETED, REVIEW_PASSED, or READY_FOR_HUMAN_APPROVAL.`,
    `12. Do not request or print secrets; do not read production credentials.`,
    ``,
    `## Delivery`,
    `- Work on the isolated Cloud Agent branch Cursor created for this run (cursor/...).`,
    `- When implementation is ready for independent review, finish cleanly so Cursor can auto-create the PR.`,
    `- Do not treat builder completion as independent review approval.`,
    ``,
    `The approved plan file is the source of truth. Prefer reading it from the repository over any summary in this prompt.`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

module.exports = {
  buildImplementationPrompt,
};
