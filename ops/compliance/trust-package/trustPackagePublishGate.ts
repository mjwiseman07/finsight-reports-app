// executable: false
// containsVerticalComplianceLogic: false
// composes-with: 42.5Q socScopeBoundary, 42.5R tscScopeBoundary, 42.5V hipaaPackScopeBoundary, 42.5U subprocessorRegistry
// purpose: publish-prohibition guard + D0 evidence reference integrity for trust package DRAFTS

import fs from "fs";
import path from "path";

const PUBLIC_DRAFTS_PREFIX = "docs/trust/public-drafts/";
const REPO_ROOT = path.join(__dirname, "../../..");

export interface TrustPackageArtifactRef {
  artifactId: string;
  draftPath: string;
  citedD0EvidencePaths: ReadonlyArray<string>;
  benchmarkClaimsCount: number;
  publishReadyFlag: false;
}

export interface TrustPackagePublishAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    artifactId: string;
    pathNamespaceValid: boolean;
    d0PathsResolvedCount: number;
    d0PathsUnresolved: ReadonlyArray<string>;
    publishReadyFlagDetected: false;
  };
}

export interface TrustPackagePublishGate {
  assertDraftIntegrity(input: TrustPackageArtifactRef): TrustPackagePublishAssertionResult;
  assertArtifactsIntegrityBatch(
    artifacts: ReadonlyArray<TrustPackageArtifactRef>,
  ): TrustPackagePublishAssertionResult;
  getDeclaredArtifacts(): ReadonlyArray<TrustPackageArtifactRef>;
}

export interface TrustPackagePublishGateMarker {
  trustPackagePublishGateId: string;
  trustPackagePublishGateKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

const D0_EVIDENCE_PATHS = {
  panel: "ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json",
  soc1: "ops/compliance/soc/soc1/D0_EVIDENCE.json",
  soc2: "ops/compliance/soc/soc2/D0_EVIDENCE.json",
  vendors: "ops/compliance/vendors/D0_EVIDENCE.json",
  hipaaPack: "ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json",
  nprmRegister: "ops/compliance/overlays/hipaa/nprm/D0_NPRM_REGISTER_EVIDENCE.json",
} as const;

const DECLARED_ARTIFACTS: ReadonlyArray<TrustPackageArtifactRef> = [
  {
    artifactId: "trust-package-readme",
    draftPath: "docs/trust/public-drafts/README.md",
    citedD0EvidencePaths: [],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
  },
  {
    artifactId: "trust-page-draft",
    draftPath: "docs/trust/public-drafts/TRUST_PAGE_DRAFT.md",
    citedD0EvidencePaths: [
      D0_EVIDENCE_PATHS.soc1,
      D0_EVIDENCE_PATHS.soc2,
      D0_EVIDENCE_PATHS.vendors,
      D0_EVIDENCE_PATHS.hipaaPack,
    ],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
  },
  {
    artifactId: "sig-lite-answers",
    draftPath: "docs/trust/public-drafts/SIG_LITE_ANSWERS_DRAFT.md",
    citedD0EvidencePaths: [
      D0_EVIDENCE_PATHS.panel,
      D0_EVIDENCE_PATHS.soc1,
      D0_EVIDENCE_PATHS.vendors,
      D0_EVIDENCE_PATHS.hipaaPack,
    ],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
  },
  {
    artifactId: "caiq-answers",
    draftPath: "docs/trust/public-drafts/CAIQ_ANSWERS_DRAFT.md",
    citedD0EvidencePaths: [
      D0_EVIDENCE_PATHS.soc2,
      D0_EVIDENCE_PATHS.vendors,
      D0_EVIDENCE_PATHS.hipaaPack,
      D0_EVIDENCE_PATHS.nprmRegister,
    ],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
  },
  {
    artifactId: "data-residency-statement",
    draftPath: "docs/trust/public-drafts/DATA_RESIDENCY_STATEMENT_DRAFT.md",
    citedD0EvidencePaths: [D0_EVIDENCE_PATHS.vendors],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
  },
  {
    artifactId: "hipaa-attestation-letter",
    draftPath: "docs/trust/public-drafts/HIPAA_ATTESTATION_LETTER_DRAFT.md",
    citedD0EvidencePaths: [D0_EVIDENCE_PATHS.hipaaPack],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
  },
];

function deny(
  artifactId: string,
  reason: string,
  options: {
    pathNamespaceValid?: boolean;
    d0PathsResolvedCount?: number;
    d0PathsUnresolved?: string[];
    publishReadyFlagDetected?: false;
  } = {},
): TrustPackagePublishAssertionResult {
  return {
    decision: "DENY",
    reason,
    evidence: {
      artifactId,
      pathNamespaceValid: options.pathNamespaceValid ?? false,
      d0PathsResolvedCount: options.d0PathsResolvedCount ?? 0,
      d0PathsUnresolved: options.d0PathsUnresolved ?? [],
      publishReadyFlagDetected: false,
    },
  };
}

function allow(
  artifactId: string,
  pathNamespaceValid: boolean,
  d0PathsResolvedCount: number,
): TrustPackagePublishAssertionResult {
  return {
    decision: "ALLOW",
    reason: "trust_package_draft_integrity_valid",
    evidence: {
      artifactId,
      pathNamespaceValid,
      d0PathsResolvedCount,
      d0PathsUnresolved: [],
      publishReadyFlagDetected: false,
    },
  };
}

function resolveD0Paths(citedD0EvidencePaths: ReadonlyArray<string>): {
  resolvedCount: number;
  unresolved: string[];
} {
  const unresolved: string[] = [];
  let resolvedCount = 0;
  for (const evidencePath of citedD0EvidencePaths) {
    const absolute = path.join(REPO_ROOT, evidencePath);
    if (fs.existsSync(absolute)) {
      resolvedCount += 1;
    } else {
      unresolved.push(evidencePath);
    }
  }
  return { resolvedCount, unresolved };
}

export function assertDraftIntegrity(
  input: TrustPackageArtifactRef,
): TrustPackagePublishAssertionResult {
  const artifactId = input?.artifactId ?? "unknown";

  if (!input?.artifactId) {
    return deny("unknown", "missing_artifact_id");
  }

  if (input.publishReadyFlag !== false) {
    return deny(artifactId, "publish-ready-flag-detected", {
      pathNamespaceValid: input.draftPath?.startsWith(PUBLIC_DRAFTS_PREFIX) ?? false,
      publishReadyFlagDetected: false,
    });
  }

  const pathNamespaceValid =
    typeof input.draftPath === "string" && input.draftPath.startsWith(PUBLIC_DRAFTS_PREFIX);
  if (!pathNamespaceValid) {
    return deny(artifactId, "path-namespace-violation", { pathNamespaceValid: false });
  }

  const { resolvedCount, unresolved } = resolveD0Paths(input.citedD0EvidencePaths ?? []);
  if (unresolved.length > 0) {
    return deny(artifactId, "d0_evidence_path_unresolved", {
      pathNamespaceValid: true,
      d0PathsResolvedCount: resolvedCount,
      d0PathsUnresolved: unresolved,
    });
  }

  return allow(artifactId, true, resolvedCount);
}

export function assertArtifactsIntegrityBatch(
  artifacts: ReadonlyArray<TrustPackageArtifactRef>,
): TrustPackagePublishAssertionResult {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return deny("unknown", "empty_artifacts_batch");
  }

  const seenIds = new Set<string>();
  for (const artifact of artifacts) {
    if (!artifact?.artifactId || seenIds.has(artifact.artifactId)) {
      return deny(artifact?.artifactId ?? "unknown", "duplicate-artifact-id");
    }
    seenIds.add(artifact.artifactId);

    const result = assertDraftIntegrity(artifact);
    if (result.decision === "DENY") {
      return result;
    }
  }

  return allow(artifacts[0]?.artifactId ?? "batch", true, artifacts.length);
}

export function getDeclaredArtifacts(): ReadonlyArray<TrustPackageArtifactRef> {
  return Object.freeze(
    DECLARED_ARTIFACTS.map((artifact) =>
      Object.freeze({
        ...artifact,
        citedD0EvidencePaths: Object.freeze([...artifact.citedD0EvidencePaths]),
      }),
    ),
  );
}

export const trustPackagePublishGate: TrustPackagePublishGate & TrustPackagePublishGateMarker = {
  assertDraftIntegrity,
  assertArtifactsIntegrityBatch,
  getDeclaredArtifacts,
  trustPackagePublishGateId: "trust-package-publish-gate:42.5X",
  trustPackagePublishGateKey: "trust-package-publish-gate:42.5X",
  containsVerticalComplianceLogic: false,
  executable: false,
};
