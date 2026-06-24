import type {
  AttestedElection,
  FrameworkId,
  OrgElectionDisagreement,
  OrgEdgeDecision,
} from "./types";

export interface CuratedRulesProjection {
  computeProjectedFramework(): { framework: FrameworkId; ruleIds: readonly string[] };
}

export function detectDisagreement(
  election: AttestedElection | null,
  projection: CuratedRulesProjection,
): OrgEdgeDecision {
  if (!election) {
    return Object.freeze({
      kind: "no-election",
      election: null,
      disagreement: null,
    });
  }

  const projected = projection.computeProjectedFramework();
  if (projected.framework === election.framework) {
    return Object.freeze({
      kind: "override",
      election,
      disagreement: null,
    });
  }

  const disagreement: OrgElectionDisagreement = Object.freeze({
    kind: "org-election-disagreement",
    orgId: election.orgId,
    attestedFramework: election.framework,
    attestedCitationHandle: election.citationHandle,
    curatedRulesWouldHaveProduced: projected.framework,
    curatedRulesCitationRefs: Object.freeze([...projected.ruleIds]),
    attestedBy: election.attestedBy,
    attestedAt: election.attestedAt,
    humanReviewRecommended: true as const,
    note: `Org ${election.orgId} attested ${election.framework} (${election.citationHandle}); curated rules would have produced ${projected.framework}. Attested election wins; advisory logged for human review.`,
  });

  return Object.freeze({
    kind: "override-with-disagreement",
    election,
    disagreement,
  });
}
