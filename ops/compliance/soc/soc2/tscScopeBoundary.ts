import {
  getDeclaredBoundary as getSoc1DeclaredBoundary,
  type DeclaredBoundary,
} from "../soc1/socScopeBoundary";

export type TscCriterion =
  | "security"
  | "availability"
  | "confidentiality"
  | "processing-integrity"
  | "privacy";

/** Readiness-pack namespaces under ops/compliance/ — not processing boundary extensions. */
const TSC_READINESS_NAMESPACE_EXTENSIONS: ReadonlyArray<string> = [
  "ops/compliance/soc/",
  "ops/compliance/operational/",
];

const DEFERRED_CRITERIA: ReadonlySet<TscCriterion> = new Set([
  "processing-integrity",
  "privacy",
]);

export interface TscBoundaryInput {
  scopeId: string;
  criteriaInScope: ReadonlyArray<TscCriterion>;
  namespacesInScope: ReadonlyArray<string>;
  namespacesOutOfScope: ReadonlyArray<string>;
}

export interface TscBoundaryAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    scopeId: string;
    soc1DeclaredBoundary: DeclaredBoundary;
    namespacesOutsideSoc1: ReadonlyArray<string>;
  };
}

export interface DeclaredTscScope {
  criteriaInScope: ReadonlyArray<string>;
  criteriaDeferred: ReadonlyArray<{
    criterion: string;
    reason: string;
    decisionGate: string;
  }>;
  spineNamespaces: ReadonlyArray<string>;
  overlayNamespaces: ReadonlyArray<string>;
  outOfScopeNamespaces: ReadonlyArray<string>;
  declaredAt: string;
}

export interface TscScopeBoundary {
  assertTscBoundaryAligned(input: TscBoundaryInput): TscBoundaryAssertionResult;
  getDeclaredTscScope(): DeclaredTscScope;
}

export interface TscScopeBoundaryMarker {
  tscScopeBoundaryId: string;
  tscScopeBoundaryKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

function deny(
  scopeId: string,
  reason: string,
  soc1DeclaredBoundary: DeclaredBoundary,
  namespacesOutsideSoc1: string[] = [],
): TscBoundaryAssertionResult {
  return {
    decision: "DENY",
    reason,
    evidence: {
      scopeId,
      soc1DeclaredBoundary,
      namespacesOutsideSoc1,
    },
  };
}

function allow(
  scopeId: string,
  reason: string,
  soc1DeclaredBoundary: DeclaredBoundary,
): TscBoundaryAssertionResult {
  return {
    decision: "ALLOW",
    reason,
    evidence: {
      scopeId,
      soc1DeclaredBoundary,
      namespacesOutsideSoc1: [],
    },
  };
}

function buildAllowedNamespacePrefixes(soc1: DeclaredBoundary): string[] {
  return [
    ...soc1.spineNamespaces,
    ...soc1.overlayNamespaces,
    ...TSC_READINESS_NAMESPACE_EXTENSIONS,
  ];
}

function isNamespaceAligned(namespace: string, allowedPrefixes: ReadonlyArray<string>): boolean {
  return allowedPrefixes.some(
    (prefix) => namespace === prefix || namespace.startsWith(prefix),
  );
}

function findNamespacesOutsideSoc1(
  namespacesInScope: ReadonlyArray<string>,
  soc1: DeclaredBoundary,
): string[] {
  const allowedPrefixes = buildAllowedNamespacePrefixes(soc1);
  return namespacesInScope.filter((namespace) => !isNamespaceAligned(namespace, allowedPrefixes));
}

export function assertTscBoundaryAligned(input: TscBoundaryInput): TscBoundaryAssertionResult {
  const soc1DeclaredBoundary = getSoc1DeclaredBoundary();
  const scopeId = input?.scopeId ?? "unknown";

  if (!input?.scopeId) {
    return deny(scopeId, "missing_scope_id", soc1DeclaredBoundary);
  }

  if (!Array.isArray(input.criteriaInScope) || input.criteriaInScope.length === 0) {
    return deny(scopeId, "empty_criteria_in_scope", soc1DeclaredBoundary);
  }

  if (!input.criteriaInScope.includes("security")) {
    return deny(scopeId, "security_criterion_required", soc1DeclaredBoundary);
  }

  for (const criterion of input.criteriaInScope) {
    if (DEFERRED_CRITERIA.has(criterion)) {
      return deny(scopeId, `deferred_criterion_in_scope:${criterion}`, soc1DeclaredBoundary);
    }
  }

  if (!Array.isArray(input.namespacesInScope) || input.namespacesInScope.length === 0) {
    return deny(scopeId, "empty_namespaces_in_scope", soc1DeclaredBoundary);
  }

  const namespacesOutsideSoc1 = findNamespacesOutsideSoc1(input.namespacesInScope, soc1DeclaredBoundary);
  if (namespacesOutsideSoc1.length > 0) {
    return deny(
      scopeId,
      "namespace_outside_soc1_declared_boundary",
      soc1DeclaredBoundary,
      namespacesOutsideSoc1,
    );
  }

  return allow(scopeId, "tsc_scope_aligned_with_soc1_boundary", soc1DeclaredBoundary);
}

export function getDeclaredTscScope(): DeclaredTscScope {
  const soc1 = getSoc1DeclaredBoundary();
  return {
    criteriaInScope: ["security", "availability", "confidentiality"],
    criteriaDeferred: [
      {
        criterion: "processing-integrity",
        reason: "Q2 auditor decision deferred to Phase 42.6",
        decisionGate: "LOCK-42.6.1",
      },
      {
        criterion: "privacy",
        reason: "Q2 auditor decision deferred to Phase 42.6; HIPAA overlay (42.5V) is dominant privacy program",
        decisionGate: "LOCK-42.6.1",
      },
    ],
    spineNamespaces: [...soc1.spineNamespaces, "ops/compliance/soc/", "ops/compliance/operational/"],
    overlayNamespaces: [...soc1.overlayNamespaces],
    outOfScopeNamespaces: [...soc1.outOfScopeNamespaces],
    declaredAt: "2026-06-20",
  };
}

export const tscScopeBoundary: TscScopeBoundary & TscScopeBoundaryMarker = {
  assertTscBoundaryAligned,
  getDeclaredTscScope,
  tscScopeBoundaryId: "tsc-scope-boundary:default",
  tscScopeBoundaryKey: "tsc-scope-boundary:default",
  containsVerticalComplianceLogic: false,
  executable: false,
};
