import type { AuditLogWriter } from "../../audit/types";
import type { TenantClassifier } from "../memory/types";

export type FrameworkId =
  | "US_GAAP"
  | "IFRS"
  | "IFRS_SME"
  | "SEC_REGS_X"
  | "SEC_FORM_20F";

export type CitationHandle =
  | "ASC_105_10_05_1"
  | "IAS_1_PRESENTATION"
  | "IFRS_FOR_SMES_S1"
  | "SEC_REG_S_X"
  | "SEC_FORM_20F_FPI";

export interface AttestedElection {
  readonly orgId: string;
  readonly framework: FrameworkId;
  readonly citationHandle: CitationHandle;
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly attestationVersion: string;
  readonly note: string;
}

export interface OrgElectionDisagreement {
  readonly kind: "org-election-disagreement";
  readonly orgId: string;
  readonly attestedFramework: FrameworkId;
  readonly attestedCitationHandle: CitationHandle;
  readonly curatedRulesWouldHaveProduced: FrameworkId;
  readonly curatedRulesCitationRefs: readonly string[];
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly humanReviewRecommended: true;
  readonly note: string;
}

export interface OrgEdgeDecision {
  readonly kind: "no-election" | "override" | "override-with-disagreement";
  readonly election: AttestedElection | null;
  readonly disagreement: OrgElectionDisagreement | null;
}

export class OrgElectionRegistryUnavailableError extends Error {
  readonly code = "ORG_ELECTION_REGISTRY_UNAVAILABLE";

  constructor(reason: string) {
    super(`OrgElectionRegistry unavailable: ${reason}`);
    this.name = "OrgElectionRegistryUnavailableError";
  }
}

export class OrgElectionConsolidationNotSupportedError extends Error {
  readonly code = "ORG_ELECTION_CONSOLIDATION_NOT_SUPPORTED";

  constructor() {
    super(
      "Consolidated/parent-subsidiary election walks are out of scope for Phase 42.7D. Deferred to Phase 42.7D.1.",
    );
    this.name = "OrgElectionConsolidationNotSupportedError";
  }
}

export interface OrgEdgeOptions {
  readonly auditLogWriter?: AuditLogWriter;
  readonly tenantClassifier?: TenantClassifier;
  readonly clockMs?: () => number;
  readonly knownTenantIds?: ReadonlySet<string>;
}

export type { OrgElectionReader } from "./OrgElectionReader";
