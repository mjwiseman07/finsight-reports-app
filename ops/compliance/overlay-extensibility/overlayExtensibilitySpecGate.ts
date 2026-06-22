// executable: false
// containsVerticalComplianceLogic: false
// composes-with: 42.5I overlayActivationRegistry, 42.5H evaluateOverlayDiscipline (FM-1/2/3)
// purpose: D6 overlay-extensibility spec integrity guard — NOT a second overlay implementation

import fs from "fs";
import path from "path";

const OVERLAY_NAMESPACE_PREFIX = "ops/compliance/overlays/";
const MOST_RESTRICTIVE_PRECEDENCE_TOKEN = "most-restrictive";
const REPO_ROOT = path.join(__dirname, "../../..");

export type OverlayIllustrationStatus = "spec_only" | "built";

export interface OverlayAttachmentSpecDescriptor {
  overlayRegistryKey: string;
  targetSlotReferenceId: string;
  activationScopeReferenceId: string;
  regulatoryScopeStatementReferenceId: string;
  precedenceConfigurationReferenceId: string;
  overlayNamespace: string;
  spineModificationAttempted: boolean;
  verticalComplianceLogicInSpine: boolean;
  citedD0EvidencePaths: ReadonlyArray<string>;
  illustrationStatus: OverlayIllustrationStatus;
}

export interface SecondOverlayFm2GateInput {
  activeOverlayRegistryKeys: ReadonlyArray<string>;
  proposedOverlay: OverlayAttachmentSpecDescriptor;
  fm2PrecedenceGateDeclared: boolean;
  precedencePolicy: "most_restrictive_wins" | string;
}

export interface OverlayExtensibilityAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    overlayRegistryKey: string;
    namespaceValid: boolean;
    fm2GateSatisfied: boolean;
    d0PathsResolvedCount: number;
    d0PathsUnresolved: ReadonlyArray<string>;
    illustrationStatus: OverlayIllustrationStatus | null;
  };
}

export interface OverlayExtensibilitySpecGate {
  assertAttachmentSpecValid(input: OverlayAttachmentSpecDescriptor): OverlayExtensibilityAssertionResult;
  assertSecondOverlayFm2Gate(input: SecondOverlayFm2GateInput): OverlayExtensibilityAssertionResult;
  getDeclaredOverlayCatalog(): ReadonlyArray<OverlayAttachmentSpecDescriptor>;
}

export interface OverlayExtensibilitySpecGateMarker {
  overlayExtensibilitySpecGateId: string;
  overlayExtensibilitySpecGateKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

const HIPAA_OVERLAY_SPEC: OverlayAttachmentSpecDescriptor = {
  overlayRegistryKey: "overlay:hipaa:42.5J",
  targetSlotReferenceId: "slot:audit_logging_event_interface",
  activationScopeReferenceId: "scope:hipaa:tenant-activation",
  regulatoryScopeStatementReferenceId: "hipaa-scope-coverage:42.5J",
  precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
  overlayNamespace: "ops/compliance/overlays/hipaa/",
  spineModificationAttempted: false,
  verticalComplianceLogicInSpine: false,
  citedD0EvidencePaths: ["ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json"],
  illustrationStatus: "built",
};

const PCI_DSS_ILLUSTRATION_SPEC: OverlayAttachmentSpecDescriptor = {
  overlayRegistryKey: "overlay:pci-dss:illustration-42.5Y",
  targetSlotReferenceId: "slot:regulated_compliant_audit_store_interface",
  activationScopeReferenceId: "scope:pci-dss:illustration-only",
  regulatoryScopeStatementReferenceId: "pci-dss-scope-statement:illustration-42.5Y",
  precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
  overlayNamespace: "ops/compliance/overlays/pci-dss/",
  spineModificationAttempted: false,
  verticalComplianceLogicInSpine: false,
  citedD0EvidencePaths: ["ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json"],
  illustrationStatus: "spec_only",
};

const DECLARED_OVERLAY_CATALOG: ReadonlyArray<OverlayAttachmentSpecDescriptor> = [
  HIPAA_OVERLAY_SPEC,
  PCI_DSS_ILLUSTRATION_SPEC,
];

function deny(
  overlayRegistryKey: string,
  reason: string,
  options: {
    namespaceValid?: boolean;
    fm2GateSatisfied?: boolean;
    d0PathsResolvedCount?: number;
    d0PathsUnresolved?: string[];
    illustrationStatus?: OverlayIllustrationStatus | null;
  } = {},
): OverlayExtensibilityAssertionResult {
  return {
    decision: "DENY",
    reason,
    evidence: {
      overlayRegistryKey,
      namespaceValid: options.namespaceValid ?? false,
      fm2GateSatisfied: options.fm2GateSatisfied ?? false,
      d0PathsResolvedCount: options.d0PathsResolvedCount ?? 0,
      d0PathsUnresolved: options.d0PathsUnresolved ?? [],
      illustrationStatus: options.illustrationStatus ?? null,
    },
  };
}

function allow(
  overlayRegistryKey: string,
  options: {
    namespaceValid: boolean;
    fm2GateSatisfied: boolean;
    d0PathsResolvedCount: number;
    illustrationStatus: OverlayIllustrationStatus;
  },
): OverlayExtensibilityAssertionResult {
  return {
    decision: "ALLOW",
    reason: "overlay_extensibility_spec_valid",
    evidence: {
      overlayRegistryKey,
      namespaceValid: options.namespaceValid,
      fm2GateSatisfied: options.fm2GateSatisfied,
      d0PathsResolvedCount: options.d0PathsResolvedCount,
      d0PathsUnresolved: [],
      illustrationStatus: options.illustrationStatus,
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

function namespaceValid(overlayNamespace: string): boolean {
  return (
    typeof overlayNamespace === "string" &&
    overlayNamespace.startsWith(OVERLAY_NAMESPACE_PREFIX) &&
    overlayNamespace.endsWith("/")
  );
}

function hasNonEmptyReference(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function assertAttachmentSpecValid(
  input: OverlayAttachmentSpecDescriptor,
): OverlayExtensibilityAssertionResult {
  const overlayRegistryKey = input?.overlayRegistryKey ?? "unknown";

  if (!hasNonEmptyReference(input?.overlayRegistryKey)) {
    return deny("unknown", "missing_overlay_registry_key");
  }

  if (input.spineModificationAttempted) {
    return deny(overlayRegistryKey, "spine-modification-forbidden");
  }

  if (input.verticalComplianceLogicInSpine) {
    return deny(overlayRegistryKey, "vertical-compliance-logic-in-spine-forbidden");
  }

  const nsValid = namespaceValid(input.overlayNamespace);
  if (!nsValid) {
    return deny(overlayRegistryKey, "overlay-namespace-violation", { namespaceValid: false });
  }

  if (
    !hasNonEmptyReference(input.targetSlotReferenceId) ||
    !hasNonEmptyReference(input.activationScopeReferenceId) ||
    !hasNonEmptyReference(input.regulatoryScopeStatementReferenceId) ||
    !hasNonEmptyReference(input.precedenceConfigurationReferenceId)
  ) {
    return deny(overlayRegistryKey, "missing-42.5I-reference-id", { namespaceValid: true });
  }

  if (input.illustrationStatus !== "spec_only" && input.illustrationStatus !== "built") {
    return deny(overlayRegistryKey, "invalid-illustration-status", { namespaceValid: true });
  }

  const { resolvedCount, unresolved } = resolveD0Paths(input.citedD0EvidencePaths ?? []);
  if (unresolved.length > 0) {
    return deny(overlayRegistryKey, "d0_evidence_path_unresolved", {
      namespaceValid: true,
      d0PathsResolvedCount: resolvedCount,
      d0PathsUnresolved: unresolved,
      illustrationStatus: input.illustrationStatus,
    });
  }

  return allow(overlayRegistryKey, {
    namespaceValid: true,
    fm2GateSatisfied: true,
    d0PathsResolvedCount: resolvedCount,
    illustrationStatus: input.illustrationStatus,
  });
}

export function assertSecondOverlayFm2Gate(
  input: SecondOverlayFm2GateInput,
): OverlayExtensibilityAssertionResult {
  const proposed = input?.proposedOverlay;
  const overlayRegistryKey = proposed?.overlayRegistryKey ?? "unknown";

  const specResult = assertAttachmentSpecValid(proposed);
  if (specResult.decision === "DENY") {
    return specResult;
  }

  const activeKeys = input?.activeOverlayRegistryKeys ?? [];
  const isSecondOverlay =
    activeKeys.length >= 1 &&
    !activeKeys.includes(overlayRegistryKey) &&
    activeKeys.some((key) => hasNonEmptyReference(key));

  if (!isSecondOverlay) {
    return allow(overlayRegistryKey, {
      namespaceValid: true,
      fm2GateSatisfied: true,
      d0PathsResolvedCount: specResult.evidence.d0PathsResolvedCount,
      illustrationStatus: proposed.illustrationStatus,
    });
  }

  const precedenceRef = proposed.precedenceConfigurationReferenceId ?? "";
  const precedencePolicyOk = input?.precedencePolicy === "most_restrictive_wins";
  const precedenceRefOk = precedenceRef.includes(MOST_RESTRICTIVE_PRECEDENCE_TOKEN);
  const fm2GateSatisfied =
    input?.fm2PrecedenceGateDeclared === true && (precedencePolicyOk || precedenceRefOk);

  if (!fm2GateSatisfied) {
    return deny(overlayRegistryKey, "fm2-precedence-gate-required-before-second-overlay", {
      namespaceValid: true,
      fm2GateSatisfied: false,
      d0PathsResolvedCount: specResult.evidence.d0PathsResolvedCount,
      illustrationStatus: proposed.illustrationStatus,
    });
  }

  return allow(overlayRegistryKey, {
    namespaceValid: true,
    fm2GateSatisfied: true,
    d0PathsResolvedCount: specResult.evidence.d0PathsResolvedCount,
    illustrationStatus: proposed.illustrationStatus,
  });
}

export function getDeclaredOverlayCatalog(): ReadonlyArray<OverlayAttachmentSpecDescriptor> {
  return Object.freeze(
    DECLARED_OVERLAY_CATALOG.map((entry) =>
      Object.freeze({
        ...entry,
        citedD0EvidencePaths: Object.freeze([...entry.citedD0EvidencePaths]),
      }),
    ),
  );
}

export const overlayExtensibilitySpecGate: OverlayExtensibilitySpecGate &
  OverlayExtensibilitySpecGateMarker = {
  assertAttachmentSpecValid,
  assertSecondOverlayFm2Gate,
  getDeclaredOverlayCatalog,
  overlayExtensibilitySpecGateId: "overlay-extensibility-spec-gate:42.5Y",
  overlayExtensibilitySpecGateKey: "overlay-extensibility-spec-gate:42.5Y",
  containsVerticalComplianceLogic: false,
  executable: false,
};
