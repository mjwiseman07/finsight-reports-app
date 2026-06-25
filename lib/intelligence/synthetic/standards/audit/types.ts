import type { FrameworkId } from "../resolver/org-edge/types";
import type { ActorRef } from "../resolver/memory/types";

export type AuditEventKind =
  | "cache.hit"
  | "cache.miss"
  | "cache.write"
  | "cache.evict.lru"
  | "cache.evict.ttl"
  | "cache.invalidate.org"
  | "cache.purge.phi"
  | "cache.dispose"
  | "role.escalation.created"
  | "role.escalation.resolved"
  | "panel.decision.execute"
  | "panel.decision.hire-up"
  | "panel.decision.escalate"
  | "panel.decision"
  | "org-edge.override.applied"
  | "org-edge.disagreement.emitted"
  | "orgEdge.reconciliation"
  | "escalation.evaluated";

export interface AuditEntry {
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly timestampISO: string;
  readonly kind: AuditEventKind;
  readonly actor: ActorRef;
  readonly subject: {
    readonly orgId?: string;
    readonly tenantId?: string;
    readonly framework?: FrameworkId;
    readonly electionFingerprint?: string | null;
    readonly cacheKeyRedacted?: string;
  };
  readonly payload: Readonly<Record<string, unknown>>;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly schemaVersion: "42.7E.1";
  readonly complianceClass: "SOC1+SOC2-T2+HIPAA";
}

export type AuditEntryPartial = Omit<
  AuditEntry,
  | "sequenceNumber"
  | "timestampMs"
  | "timestampISO"
  | "prevHash"
  | "entryHash"
  | "schemaVersion"
  | "complianceClass"
>;

export interface AuditLogWriter {
  append(entry: AuditEntryPartial): void;
  flush(): Promise<void>;
  headHash(): string;
  state(): { totalEntries: number; currentFile: string; headHash: string };
}

export interface RetentionPolicy {
  readonly minDays: 365;
  readonly soc1Days: number;
  readonly hipaaDays: number;
  readonly purgeAllowed: boolean;
  readonly requireFsync?: boolean;
}

export type { ActorRef };

export type EscalationDecisionOutcome =
  | "no-escalation"
  | "escalate-tier-up"
  | "escalate-to-founder"
  | "decline-out-of-scope";

export type MaterialityTier = "low" | "medium" | "high" | "critical";
export type ComplexityTier = "simple" | "moderate" | "complex" | "novel";
export type TenantClassification = "standard" | "phi-covered";

/**
 * Payload shape for kind: escalation.evaluated (Phase 42.7B.1).
 * Emitted on every evaluation regardless of outcome (B1.D1).
 */
export interface EscalationEvaluatedEntry {
  readonly event: "escalation-evaluated";
  readonly callerPersonaHandle: string;
  readonly callerTenantId: string;
  readonly callerSessionId: string;
  readonly callerOrgHandle: string;
  readonly materialityTier: MaterialityTier;
  readonly complexityTier: ComplexityTier;
  readonly topicHandle: string;
  readonly industryHandle: string;
  readonly decisionOutcome: EscalationDecisionOutcome;
  readonly targetPersonaHandle: string | null;
  readonly citationHandlesConsulted: readonly string[];
  readonly matchedRules: readonly string[];
  readonly unresolvedConflicts: readonly string[];
  readonly tenantClassification: TenantClassification;
}

export function validateEscalationEvaluatedEntry(entry: EscalationEvaluatedEntry): void {
  const requiredStrings: Array<keyof EscalationEvaluatedEntry> = [
    "event",
    "callerPersonaHandle",
    "callerTenantId",
    "callerSessionId",
    "callerOrgHandle",
    "materialityTier",
    "complexityTier",
    "topicHandle",
    "industryHandle",
    "decisionOutcome",
    "tenantClassification",
  ];
  for (const field of requiredStrings) {
    const value = entry[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`EscalationEvaluatedEntry missing or empty field: ${field}`);
    }
  }
  if (entry.event !== "escalation-evaluated") {
    throw new Error(`EscalationEvaluatedEntry invalid event: ${entry.event}`);
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "targetPersonaHandle")) {
    throw new Error("EscalationEvaluatedEntry missing targetPersonaHandle");
  }
  const outcomes: EscalationDecisionOutcome[] = [
    "no-escalation",
    "escalate-tier-up",
    "escalate-to-founder",
    "decline-out-of-scope",
  ];
  if (!outcomes.includes(entry.decisionOutcome)) {
    throw new Error(`EscalationEvaluatedEntry invalid decisionOutcome: ${entry.decisionOutcome}`);
  }
  if (!Array.isArray(entry.citationHandlesConsulted)) {
    throw new Error("EscalationEvaluatedEntry citationHandlesConsulted must be array");
  }
  if (!Array.isArray(entry.matchedRules)) {
    throw new Error("EscalationEvaluatedEntry matchedRules must be array");
  }
  if (!Array.isArray(entry.unresolvedConflicts)) {
    throw new Error("EscalationEvaluatedEntry unresolvedConflicts must be array");
  }
}

export type PanelAdvisorySeverityTier = "informational" | "caution" | "blocking";

/**
 * Phase 42.7C.2 — Panel Decision Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - advisoryBundlingDoctrine: true (one panel call = one audit entry; advisories bundled)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */

/**
 * Per-advisory summary embedded inside a PanelDecisionEntry.
 * All anchors are source-name citation handles from the 5 locked set (C2.D9).
 */
export interface PanelAdvisorySummary {
  readonly advisoryHandle: string;
  readonly severityTier: PanelAdvisorySeverityTier;
  readonly citationHandle: string;
  readonly matchedRule: string;
}

const LOCKED_PANEL_CITATION_HANDLES = new Set([
  "ASC_105_10_05_1",
  "IAS_1_PRESENTATION",
  "IFRS_FOR_SMES_S1",
  "SEC_REG_S_X",
  "SEC_FORM_20F_FPI",
]);

/**
 * Emitted by the industry panel consumer on every decision call.
 * One invocation = one entry (C2.D2). Advisories derived during the
 * invocation are bundled in advisoriesGenerated; they are NOT emitted
 * as separate entries.
 */
export interface PanelDecisionEntry {
  readonly event: "panel.decision";
  readonly callerPersonaHandle: string;
  readonly callerTenantId: string;
  readonly callerSessionId: string;
  readonly callerOrgHandle: string;
  readonly industryHandle: string;
  readonly panelHandle: string;
  readonly topicHandle: string;
  readonly treatmentRequestId: string;
  readonly matchedRules: readonly string[];
  readonly citationHandlesConsulted: readonly string[];
  readonly unresolvedConflicts: readonly string[];
  readonly resolvedBy: string | null;
  readonly election: string | null;
  readonly advisoryCount: number;
  readonly advisoriesGenerated: readonly PanelAdvisorySummary[];
  readonly tenantClassification: TenantClassification;
}

export function validatePanelDecisionEntry(entry: PanelDecisionEntry): void {
  const requiredStrings: Array<keyof PanelDecisionEntry> = [
    "event",
    "callerPersonaHandle",
    "callerTenantId",
    "callerSessionId",
    "callerOrgHandle",
    "industryHandle",
    "panelHandle",
    "topicHandle",
    "treatmentRequestId",
    "tenantClassification",
  ];
  for (const field of requiredStrings) {
    const value = entry[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`PanelDecisionEntry missing or empty field: ${field}`);
    }
  }
  if (entry.event !== "panel.decision") {
    throw new Error(`PanelDecisionEntry invalid event: ${entry.event}`);
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "resolvedBy")) {
    throw new Error("PanelDecisionEntry missing resolvedBy");
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "election")) {
    throw new Error("PanelDecisionEntry missing election");
  }
  if (typeof entry.advisoryCount !== "number" || entry.advisoryCount < 0) {
    throw new Error("PanelDecisionEntry advisoryCount must be a non-negative number");
  }
  if (!Array.isArray(entry.matchedRules)) {
    throw new Error("PanelDecisionEntry matchedRules must be array");
  }
  if (!Array.isArray(entry.citationHandlesConsulted)) {
    throw new Error("PanelDecisionEntry citationHandlesConsulted must be array");
  }
  if (!Array.isArray(entry.unresolvedConflicts)) {
    throw new Error("PanelDecisionEntry unresolvedConflicts must be array");
  }
  if (!Array.isArray(entry.advisoriesGenerated)) {
    throw new Error("PanelDecisionEntry advisoriesGenerated must be array");
  }
  if (entry.advisoriesGenerated.length !== entry.advisoryCount) {
    throw new Error(
      "PanelDecisionEntry advisoriesGenerated.length must equal advisoryCount",
    );
  }
  for (const handle of entry.citationHandlesConsulted) {
    if (!LOCKED_PANEL_CITATION_HANDLES.has(handle)) {
      throw new Error(`PanelDecisionEntry citation handle outside locked set: ${handle}`);
    }
  }
  for (const advisory of entry.advisoriesGenerated) {
    if (
      typeof advisory.advisoryHandle !== "string" ||
      advisory.advisoryHandle.length === 0
    ) {
      throw new Error("PanelAdvisorySummary missing advisoryHandle");
    }
    if (
      advisory.severityTier !== "informational" &&
      advisory.severityTier !== "caution" &&
      advisory.severityTier !== "blocking"
    ) {
      throw new Error(`PanelAdvisorySummary invalid severityTier: ${advisory.severityTier}`);
    }
    if (!LOCKED_PANEL_CITATION_HANDLES.has(advisory.citationHandle)) {
      throw new Error(
        `PanelAdvisorySummary citation handle outside locked set: ${advisory.citationHandle}`,
      );
    }
    if (typeof advisory.matchedRule !== "string" || advisory.matchedRule.length === 0) {
      throw new Error("PanelAdvisorySummary missing matchedRule");
    }
  }
}

/**
 * Phase 42.7D.1-audit — Org-Edge Reconciliation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
export interface CallerIdentity {
  readonly personaHandle: string;
  readonly tenantId: string;
  readonly tenantClassification: TenantClassification;
  readonly invocationContext: {
    readonly requestId: string;
    readonly parentRequestId: string | null;
    readonly invokedAt: string;
  };
}

export interface AttestationLink {
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly attestationHandle: string;
}

export type ReconciliationDiff =
  | { readonly kind: "none" }
  | {
      readonly kind: "override-applied";
      readonly orgPolicyHandle: string;
      readonly panelFrameworkHandle: string;
      readonly resolvedFrameworkHandle: string;
      readonly attestationChain: readonly AttestationLink[];
      readonly resolutionRule: string;
    };

export interface OrgEdgeReconciliationEntry {
  readonly event: "orgEdge.reconciliation";
  readonly version: 1;
  readonly tenantClassification: TenantClassification;
  readonly callerIdentity: CallerIdentity;
  readonly outcome: "agreement" | "disagreement";
  readonly diff: ReconciliationDiff;
  readonly citationHandles: readonly string[];
}

export type OrgEdgeReconciliationContext = OrgEdgeReconciliationEntry;

