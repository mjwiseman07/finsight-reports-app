/**
 * Phase 42.7C.2 — Panel Decision Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (panel selections support, not replace, controller judgment)
 *  - humanWorkerParityDoctrine: true (panel authority modeled on AICPA CGMA framework)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (panel-consumer deterministic logic byte-identical to c8bddc8)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 *  - advisoryBundlingDoctrine: true (one panel call = one audit entry; advisories bundled)
 */
import type { PanelAdvisorySummary } from "../standards/audit/types";
import {
  filterLockedCitationHandles,
  pickLockedCitationHandle,
} from "./locked-citation-handles";
import type { RoutingDecision } from "./types";

export interface PanelDecisionMetadata {
  readonly matchedRules: readonly string[];
  readonly citationHandlesConsulted: readonly string[];
  readonly unresolvedConflicts: readonly string[];
  readonly resolvedBy: string | null;
  readonly election: string | null;
}

export function extractPanelDecisionMetadata(decision: RoutingDecision): PanelDecisionMetadata {
  if (decision.kind === "execute") {
    const capability = decision.effectiveJD.capabilities.find(
      (entry) => entry.capabilityId === decision.capabilityId,
    );
    const citations = filterLockedCitationHandles(capability?.citationHandles ?? []);
    return Object.freeze({
      matchedRules: Object.freeze([decision.capabilityId]),
      citationHandlesConsulted: citations,
      unresolvedConflicts: Object.freeze([]),
      resolvedBy: decision.capabilityId,
      election: null,
    });
  }

  if (decision.kind === "hire-up") {
    const recommendation = decision.recommendation;
    return Object.freeze({
      matchedRules: Object.freeze([recommendation.capabilityId]),
      citationHandlesConsulted: Object.freeze(
        filterLockedCitationHandles(recommendation.citationHandles),
      ),
      unresolvedConflicts: Object.freeze([recommendation.capabilityId]),
      resolvedBy: null,
      election: null,
    });
  }

  const ticket = decision.escalationTicket;
  return Object.freeze({
    matchedRules: Object.freeze([ticket.registryEntryId]),
    citationHandlesConsulted: Object.freeze([]),
    unresolvedConflicts: Object.freeze([ticket.reason]),
    resolvedBy: null,
    election: null,
  });
}

export function derivePanelAdvisoriesPure(decision: RoutingDecision): readonly PanelAdvisorySummary[] {
  if (decision.kind === "execute") {
    return [];
  }

  if (decision.kind === "hire-up") {
    const recommendation = decision.recommendation;
    return Object.freeze([
      Object.freeze({
        advisoryHandle: recommendation.recommendationId,
        severityTier: "caution" as const,
        citationHandle: pickLockedCitationHandle(recommendation.citationHandles),
        matchedRule: recommendation.capabilityId,
      }),
    ]);
  }

  const ticket = decision.escalationTicket;
  const advisories: PanelAdvisorySummary[] = [
    Object.freeze({
      advisoryHandle: `escalate-${ticket.registryEntryId}`,
      severityTier: "blocking" as const,
      citationHandle: "ASC_105_10_05_1" as const,
      matchedRule: ticket.registryEntryId,
    }),
  ];
  if (ticket.reason.includes("Hard-stop")) {
    advisories.unshift(
      Object.freeze({
        advisoryHandle: `hard-stop-${ticket.registryEntryId}`,
        severityTier: "informational" as const,
        citationHandle: "ASC_105_10_05_1" as const,
        matchedRule: ticket.registryEntryId,
      }),
    );
  }
  return Object.freeze(advisories);
}
