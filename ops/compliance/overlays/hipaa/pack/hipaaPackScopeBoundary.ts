// executable: false
// containsVerticalComplianceLogic: false
// composes-with: 42.5Q socScopeBoundary, 42.5J HipaaOverlayScopeContract
// purpose: scope-alignment guard for HIPAA Compliance Pack drafts; NOT a safeguard implementation

import type { HipaaOverlayScopeContract } from "../contracts/HipaaOverlayContracts";
import {
  getDeclaredBoundary as getSoc1DeclaredBoundary,
  type DeclaredBoundary,
} from "../../../soc/soc1/socScopeBoundary";

const ALLOWED_SUBPARTS_IN_SCOPE = ["A", "C", "D-incident-only"] as const;
const REQUIRED_SUBPARTS_OUT_OF_SCOPE = ["B", "D-full", "E"] as const;
const FORBIDDEN_SUBPARTS_IN_SCOPE = ["B", "D-full", "E"] as const;

const REQUIRED_SAFEGUARD_CATEGORIES = [
  "administrative-164.308",
  "physical-164.310",
  "technical-164.312",
  "organizational-164.314",
  "documentation-164.316",
] as const;

const NPRM_KEYWORDS = ["NPRM", "2025 proposed", "anticipated rule", "future rule"] as const;

const PACK_NAMESPACE = "ops/compliance/overlays/hipaa/pack/";

/** Opaque 42.5J HipaaOverlayScopeContract reference — not reimplemented here. */
const HIPAA_OVERLAY_SCOPE_CONTRACT_REF: HipaaOverlayScopeContract = {
  overlayContract: true,
  containsVerticalComplianceLogic: true,
  executable: false,
  hipaaOverlayScopeContractId: "hipaa-overlay-scope-contract:42.5J-ref",
  hipaaOverlayScopeContractKey: "hipaa-overlay-scope-contract:42.5J-ref",
  regulatoryBasisStatus: "current_final_rule",
  regulatoryAuthorityCitation: "45 CFR Part 164 Subparts A and C",
  coveredSubpartKeys: ["164_subpart_a", "164_subpart_c"],
  scopeCoverageStatementReferenceId: "hipaa-scope-coverage:42.5J",
  scopeCoverageSummaryReferenceId: "hipaa-scope-summary:42.5J",
  explicitNonCoverageCategories: [
    "soc_2_controls",
    "pci_dss_controls",
    "clinical_data_workflow_controls",
    "non_healthcare_tenant_operations",
    "spine_universal_controls",
  ],
  scopeNonCoverageStatementReferenceId: "hipaa-scope-non-coverage:42.5J",
  spineRegulatoryScopeStatementReferenceId: "spine-regulatory-scope:42.5J",
};

export interface HipaaPackScopeInput {
  packScopeId: string;
  subpartsInScope: ReadonlyArray<"A" | "C" | "D-incident-only">;
  subpartsExplicitlyOutOfScope: ReadonlyArray<"B" | "D-full" | "E">;
  safeguardCategoriesInScope: ReadonlyArray<
    | "administrative-164.308"
    | "physical-164.310"
    | "technical-164.312"
    | "organizational-164.314"
    | "documentation-164.316"
  >;
  namespacesInScope: ReadonlyArray<string>;
  excludesNprmAnticipation: true;
}

export interface HipaaPackScopeAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    packScopeId: string;
    soc1DeclaredBoundary: unknown;
    hipaaOverlayScopeContract: unknown;
    subpartsOutOfBoundsAttempted: ReadonlyArray<string>;
    namespacesOutsideSoc1: ReadonlyArray<string>;
    nprmAnticipationDetected: boolean;
  };
}

export interface DeclaredHipaaPackScope {
  subpartsInScope: ReadonlyArray<string>;
  subpartsOutOfScope: ReadonlyArray<string>;
  safeguardCategoriesInScope: ReadonlyArray<string>;
  spineNamespaces: ReadonlyArray<string>;
  overlayNamespaces: ReadonlyArray<string>;
  declaredAt: string;
  counselReviewStatus: "pending-42.6E";
}

export interface HipaaPackScopeBoundary {
  assertPackScopeAligned(input: HipaaPackScopeInput): HipaaPackScopeAssertionResult;
  getDeclaredPackScope(): DeclaredHipaaPackScope;
}

export interface HipaaPackScopeBoundaryMarker {
  hipaaPackScopeBoundaryId: string;
  hipaaPackScopeBoundaryKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

function collectStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStrings(entry, strings);
    }
    return strings;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      collectStrings(entry, strings);
    }
  }
  return strings;
}

function detectNprmAnticipation(input: HipaaPackScopeInput): boolean {
  const strings = collectStrings(input);
  const haystack = strings.join(" ").toLowerCase();
  return NPRM_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function isNamespaceAligned(namespace: string, soc1: DeclaredBoundary): boolean {
  const allowedPrefixes = [...soc1.spineNamespaces, ...soc1.overlayNamespaces];
  return allowedPrefixes.some(
    (prefix) => namespace === prefix || namespace.startsWith(prefix),
  );
}

function findNamespacesOutsideSoc1(
  namespacesInScope: ReadonlyArray<string>,
  soc1: DeclaredBoundary,
): string[] {
  return namespacesInScope.filter((namespace) => !isNamespaceAligned(namespace, soc1));
}

function deny(
  packScopeId: string,
  reason: string,
  soc1DeclaredBoundary: DeclaredBoundary,
  options: {
    subpartsOutOfBoundsAttempted?: string[];
    namespacesOutsideSoc1?: string[];
    nprmAnticipationDetected?: boolean;
  } = {},
): HipaaPackScopeAssertionResult {
  return {
    decision: "DENY",
    reason,
    evidence: {
      packScopeId,
      soc1DeclaredBoundary,
      hipaaOverlayScopeContract: HIPAA_OVERLAY_SCOPE_CONTRACT_REF,
      subpartsOutOfBoundsAttempted: options.subpartsOutOfBoundsAttempted ?? [],
      namespacesOutsideSoc1: options.namespacesOutsideSoc1 ?? [],
      nprmAnticipationDetected: options.nprmAnticipationDetected ?? false,
    },
  };
}

function allow(packScopeId: string, reason: string, soc1DeclaredBoundary: DeclaredBoundary): HipaaPackScopeAssertionResult {
  return {
    decision: "ALLOW",
    reason,
    evidence: {
      packScopeId,
      soc1DeclaredBoundary,
      hipaaOverlayScopeContract: HIPAA_OVERLAY_SCOPE_CONTRACT_REF,
      subpartsOutOfBoundsAttempted: [],
      namespacesOutsideSoc1: [],
      nprmAnticipationDetected: false,
    },
  };
}

export function assertPackScopeAligned(input: HipaaPackScopeInput): HipaaPackScopeAssertionResult {
  const soc1DeclaredBoundary = getSoc1DeclaredBoundary();
  const packScopeId = input?.packScopeId ?? "unknown";

  if (!input?.packScopeId) {
    return deny(packScopeId, "missing_pack_scope_id", soc1DeclaredBoundary);
  }

  if (input.excludesNprmAnticipation !== true) {
    return deny(packScopeId, "excludes_nprm_anticipation_must_be_literal_true", soc1DeclaredBoundary);
  }

  if (detectNprmAnticipation(input)) {
    return deny(packScopeId, "nprm_anticipation_detected_in_scope_metadata", soc1DeclaredBoundary, {
      nprmAnticipationDetected: true,
    });
  }

  const subpartsOutOfBoundsAttempted: string[] = [];

  if (!Array.isArray(input.subpartsInScope) || input.subpartsInScope.length === 0) {
    return deny(packScopeId, "empty_subparts_in_scope", soc1DeclaredBoundary);
  }

  for (const subpart of input.subpartsInScope) {
    if (!ALLOWED_SUBPARTS_IN_SCOPE.includes(subpart)) {
      subpartsOutOfBoundsAttempted.push(subpart);
    }
    if (FORBIDDEN_SUBPARTS_IN_SCOPE.includes(subpart as (typeof FORBIDDEN_SUBPARTS_IN_SCOPE)[number])) {
      if (!subpartsOutOfBoundsAttempted.includes(subpart)) {
        subpartsOutOfBoundsAttempted.push(subpart);
      }
    }
  }

  if (subpartsOutOfBoundsAttempted.length > 0) {
    const reason = subpartsOutOfBoundsAttempted.includes("B")
      ? "subpart_b_out_of_pack_scope"
      : subpartsOutOfBoundsAttempted.includes("E")
        ? "subpart_e_out_of_pack_scope"
        : subpartsOutOfBoundsAttempted.includes("D-full")
          ? "subpart_d_full_out_of_pack_scope_incident_only_layering"
          : "subpart_out_of_bounds";
    return deny(packScopeId, reason, soc1DeclaredBoundary, { subpartsOutOfBoundsAttempted });
  }

  if (!Array.isArray(input.subpartsExplicitlyOutOfScope)) {
    return deny(packScopeId, "missing_subparts_explicitly_out_of_scope", soc1DeclaredBoundary);
  }

  for (const required of REQUIRED_SUBPARTS_OUT_OF_SCOPE) {
    if (!input.subpartsExplicitlyOutOfScope.includes(required)) {
      return deny(
        packScopeId,
        `missing_explicit_out_of_scope_disclaimer:${required}`,
        soc1DeclaredBoundary,
      );
    }
  }

  if (!Array.isArray(input.safeguardCategoriesInScope) || input.safeguardCategoriesInScope.length === 0) {
    return deny(packScopeId, "empty_safeguard_categories_in_scope", soc1DeclaredBoundary);
  }

  for (const required of REQUIRED_SAFEGUARD_CATEGORIES) {
    if (!input.safeguardCategoriesInScope.includes(required)) {
      return deny(packScopeId, `missing_safeguard_category:${required}`, soc1DeclaredBoundary);
    }
  }

  if (!Array.isArray(input.namespacesInScope) || input.namespacesInScope.length === 0) {
    return deny(packScopeId, "empty_namespaces_in_scope", soc1DeclaredBoundary);
  }

  const namespacesOutsideSoc1 = findNamespacesOutsideSoc1(input.namespacesInScope, soc1DeclaredBoundary);
  if (namespacesOutsideSoc1.length > 0) {
    return deny(packScopeId, "namespace_outside_soc1_declared_boundary", soc1DeclaredBoundary, {
      namespacesOutsideSoc1,
    });
  }

  return allow(packScopeId, "hipaa_pack_scope_aligned_with_soc1_and_overlay_contract", soc1DeclaredBoundary);
}

export function getDeclaredPackScope(): DeclaredHipaaPackScope {
  const soc1 = getSoc1DeclaredBoundary();
  return Object.freeze({
    subpartsInScope: ["A", "C", "D-incident-only"],
    subpartsOutOfScope: ["B", "D-full", "E"],
    safeguardCategoriesInScope: [...REQUIRED_SAFEGUARD_CATEGORIES],
    spineNamespaces: Object.freeze([...soc1.spineNamespaces]),
    overlayNamespaces: Object.freeze([...soc1.overlayNamespaces, PACK_NAMESPACE]),
    declaredAt: "2026-06-20",
    counselReviewStatus: "pending-42.6E" as const,
  });
}

export const hipaaPackScopeBoundary: HipaaPackScopeBoundary & HipaaPackScopeBoundaryMarker = {
  assertPackScopeAligned,
  getDeclaredPackScope,
  hipaaPackScopeBoundaryId: "hipaa-pack-scope-boundary:42.5V",
  hipaaPackScopeBoundaryKey: "hipaa-pack-scope-boundary:42.5V",
  containsVerticalComplianceLogic: false,
  executable: false,
};
