/**
 * Phase 42.7F — Cross-Phase Wiring Verifier
 */
import type { AuditEventKind } from "../../lib/intelligence/synthetic/standards/audit/types";

export type WiringHopName =
  | "role-adapter"
  | "escalation"
  | "panel"
  | "org-edge"
  | "cache-access"
  | "cache-eviction";

export interface ExpectedHop {
  readonly hop: WiringHopName;
  readonly expectedKind: AuditEventKind;
  readonly expectedOutcome: string | null;
  readonly expectedTenantClassification: "standard" | "phi-covered";
  readonly expectedAdvisoryCountMin: number | null;
  readonly expectedDiffKind: "none" | "override-applied" | null;
}

export function expectedEscalationHop(
  tenantClassification: "standard" | "phi-covered",
  outcome: string,
): ExpectedHop {
  return Object.freeze({
    hop: "escalation",
    expectedKind: "escalation.evaluated",
    expectedOutcome: outcome,
    expectedTenantClassification: tenantClassification,
    expectedAdvisoryCountMin: null,
    expectedDiffKind: null,
  });
}

export function expectedPanelHop(
  tenantClassification: "standard" | "phi-covered",
  advisoryCountMin = 0,
): ExpectedHop {
  return Object.freeze({
    hop: "panel",
    expectedKind: "panel.decision",
    expectedOutcome: null,
    expectedTenantClassification: tenantClassification,
    expectedAdvisoryCountMin: advisoryCountMin,
    expectedDiffKind: null,
  });
}

export function expectedOrgEdgeHop(
  tenantClassification: "standard" | "phi-covered",
  outcome: "agreement" | "disagreement",
  diffKind: "none" | "override-applied",
): ExpectedHop {
  return Object.freeze({
    hop: "org-edge",
    expectedKind: "orgEdge.reconciliation",
    expectedOutcome: outcome,
    expectedTenantClassification: tenantClassification,
    expectedAdvisoryCountMin: null,
    expectedDiffKind: diffKind,
  });
}

export function expectedCacheAccessHop(
  tenantClassification: "standard" | "phi-covered",
  kind: "cache.miss" | "cache.write" | "cache.hit",
): ExpectedHop {
  return Object.freeze({
    hop: "cache-access",
    expectedKind: kind,
    expectedOutcome: null,
    expectedTenantClassification: tenantClassification,
    expectedAdvisoryCountMin: null,
    expectedDiffKind: null,
  });
}

export function assertHopsMatchEntries(
  expectedHops: readonly ExpectedHop[],
  entries: readonly { kind: string; payload: Record<string, unknown> }[],
): string | null {
  const auditKinds = entries.map((entry) => entry.kind);
  let entryIndex = 0;
  for (const hop of expectedHops) {
    const foundIndex = auditKinds.indexOf(hop.expectedKind, entryIndex);
    if (foundIndex < 0) {
      return `missing expected kind ${hop.expectedKind} for hop ${hop.hop}`;
    }
    const payload = entries[foundIndex]!.payload;
    const tenantClass = String(payload.tenantClassification ?? "");
    if (tenantClass !== hop.expectedTenantClassification) {
      return `${hop.expectedKind} tenantClassification expected ${hop.expectedTenantClassification}, got ${tenantClass}`;
    }
    if (hop.expectedOutcome !== null) {
      const event = String(payload.event ?? "");
      const outcome = String(payload.decisionOutcome ?? payload.outcome ?? event);
      if (!outcome.includes(hop.expectedOutcome) && outcome !== hop.expectedOutcome) {
        if (hop.expectedKind === "escalation.evaluated" && payload.decisionOutcome !== hop.expectedOutcome) {
          return `${hop.expectedKind} outcome expected ${hop.expectedOutcome}, got ${String(payload.decisionOutcome)}`;
        }
        if (hop.expectedKind === "orgEdge.reconciliation" && payload.outcome !== hop.expectedOutcome) {
          return `${hop.expectedKind} outcome expected ${hop.expectedOutcome}, got ${String(payload.outcome)}`;
        }
      }
    }
    if (hop.expectedDiffKind !== null) {
      const diff = payload.diff as { kind?: string } | undefined;
      if (diff?.kind !== hop.expectedDiffKind) {
        return `${hop.expectedKind} diff.kind expected ${hop.expectedDiffKind}, got ${String(diff?.kind)}`;
      }
    }
    if (hop.expectedAdvisoryCountMin !== null) {
      const count = Number(payload.advisoryCount ?? -1);
      if (count < hop.expectedAdvisoryCountMin) {
        return `${hop.expectedKind} advisoryCount expected >= ${hop.expectedAdvisoryCountMin}, got ${count}`;
      }
    }
    entryIndex = foundIndex + 1;
  }
  return null;
}
