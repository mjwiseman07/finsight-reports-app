/**
 * Phase 42.7D.1-audit — Org-Edge Reconciliation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (reconciliation supports, not replaces, controller judgment)
 *  - humanWorkerParityDoctrine: true (org authority modeled on attested elections)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (deterministic logic byte-identical to 20b4bdf)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
import type { AttestationLink, OrgEdgeReconciliationContext } from "../../audit/types";
import type { AttestedElection, OrgEdgeDecision } from "./types";
import type { CuratedRulesProjection } from "./orgStandardsEdgePure";
import { filterLockedCitationHandles } from "../../../panel-consumer/locked-citation-handles";

export interface ReconciliationInput {
  readonly election: AttestedElection | null;
  readonly projection: CuratedRulesProjection;
  readonly callerIdentity: OrgEdgeReconciliationContext["callerIdentity"];
}

function buildOrgPolicyHandle(election: AttestedElection): string {
  return `org-policy:${election.orgId}:${election.framework}`;
}

function buildAttestationChain(election: AttestedElection): readonly AttestationLink[] {
  return Object.freeze([
    Object.freeze({
      attestedBy: election.attestedBy,
      attestedAt: election.attestedAt,
      attestationHandle: election.citationHandle,
    }),
  ]);
}

export function deriveOrgEdgeReconciliationContextPure(
  input: ReconciliationInput,
  pureResult: OrgEdgeDecision,
): OrgEdgeReconciliationContext {
  const tenantClassification = input.callerIdentity.tenantClassification;

  if (pureResult.kind === "no-election") {
    return Object.freeze({
      event: "orgEdge.reconciliation",
      version: 1 as const,
      tenantClassification,
      callerIdentity: input.callerIdentity,
      outcome: "agreement" as const,
      diff: Object.freeze({ kind: "none" as const }),
      citationHandles: Object.freeze([]),
    });
  }

  const election = pureResult.election!;
  const citationHandles = filterLockedCitationHandles([election.citationHandle]);

  if (pureResult.kind === "override") {
    return Object.freeze({
      event: "orgEdge.reconciliation",
      version: 1 as const,
      tenantClassification,
      callerIdentity: input.callerIdentity,
      outcome: "agreement" as const,
      diff: Object.freeze({ kind: "none" as const }),
      citationHandles: Object.freeze(citationHandles),
    });
  }

  const disagreement = pureResult.disagreement!;
  const projectedFramework = disagreement.curatedRulesWouldHaveProduced;
  return Object.freeze({
    event: "orgEdge.reconciliation",
    version: 1 as const,
    tenantClassification,
    callerIdentity: input.callerIdentity,
    outcome: "disagreement" as const,
    diff: Object.freeze({
      kind: "override-applied" as const,
      orgPolicyHandle: buildOrgPolicyHandle(election),
      panelFrameworkHandle: projectedFramework,
      resolvedFrameworkHandle: election.framework,
      attestationChain: buildAttestationChain(election),
      resolutionRule: "org-election-override-wins",
    }),
    citationHandles: Object.freeze(
      filterLockedCitationHandles([
        election.citationHandle,
        disagreement.attestedCitationHandle,
      ]),
    ),
  });
}
