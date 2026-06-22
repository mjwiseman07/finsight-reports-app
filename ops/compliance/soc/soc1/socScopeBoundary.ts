/** Spine boundary taxonomy tags — aligned with 42.5P / probe fixtures (42.5A consumption markers). */
export const SOC_BOUNDARY_TAXONOMY_TAGS = [
  "patient-identifier",
  "electronic-phi-marker",
  "financial-summary",
  "firm-internal-note",
  "client-ledger-line",
  "cross-tenant-aggregate",
] as const;

const KNOWN_TAXONOMY_TAGS: ReadonlySet<string> = new Set(SOC_BOUNDARY_TAXONOMY_TAGS);

export interface BoundaryDiagramInput {
  diagramId: string;
  nodes: ReadonlyArray<{
    nodeId: string;
    namespace: string;
    dataTags: ReadonlyArray<{
      taxonomy: string;
      phi: boolean;
      socScopeFlagged: boolean;
    }>;
  }>;
}

export interface BoundaryAssertionResult {
  decision: "DENY" | "ALLOW";
  reason: string;
  evidence: {
    diagramId: string;
    unflaggedPhiNodes: ReadonlyArray<string>;
  };
}

export interface DeclaredBoundary {
  spineNamespaces: ReadonlyArray<string>;
  overlayNamespaces: ReadonlyArray<string>;
  outOfScopeNamespaces: ReadonlyArray<string>;
  declaredAt: string;
}

export interface SocScopeBoundary {
  assertPhiFlagged(input: BoundaryDiagramInput): BoundaryAssertionResult;
  getDeclaredBoundary(): DeclaredBoundary;
}

export interface SocScopeBoundaryMarker {
  socScopeBoundaryId: string;
  socScopeBoundaryKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

const DECLARED_BOUNDARY: DeclaredBoundary = {
  spineNamespaces: ["ops/control-spine/"],
  overlayNamespaces: ["ops/compliance/overlays/hipaa/"],
  outOfScopeNamespaces: ["lib/intelligence/synthetic/industry/"],
  declaredAt: "2026-06-20",
};

function deny(
  diagramId: string,
  reason: string,
  unflaggedPhiNodes: string[] = [],
): BoundaryAssertionResult {
  return {
    decision: "DENY",
    reason,
    evidence: { diagramId, unflaggedPhiNodes },
  };
}

function allow(diagramId: string, reason: string): BoundaryAssertionResult {
  return {
    decision: "ALLOW",
    reason,
    evidence: { diagramId, unflaggedPhiNodes: [] },
  };
}

export function assertPhiFlagged(input: BoundaryDiagramInput): BoundaryAssertionResult {
  if (!input?.diagramId) {
    return deny("unknown", "missing_diagram_id");
  }

  if (!Array.isArray(input.nodes) || input.nodes.length === 0) {
    return deny(input.diagramId, "empty_nodes_array");
  }

  const unflaggedPhiNodes: string[] = [];

  for (const node of input.nodes) {
    if (!Array.isArray(node.dataTags)) {
      return deny(input.diagramId, "missing_data_tags", [node.nodeId]);
    }

    for (const tag of node.dataTags) {
      if (!KNOWN_TAXONOMY_TAGS.has(tag.taxonomy)) {
        return deny(input.diagramId, "unknown_taxonomy", [node.nodeId]);
      }

      if (tag.phi && !tag.socScopeFlagged) {
        if (!unflaggedPhiNodes.includes(node.nodeId)) {
          unflaggedPhiNodes.push(node.nodeId);
        }
      }
    }
  }

  if (unflaggedPhiNodes.length > 0) {
    return deny(input.diagramId, "phi_not_flagged_for_soc_scope", unflaggedPhiNodes);
  }

  return allow(input.diagramId, "all_phi_nodes_soc_scope_flagged");
}

export function getDeclaredBoundary(): DeclaredBoundary {
  return { ...DECLARED_BOUNDARY };
}

export const socScopeBoundary: SocScopeBoundary & SocScopeBoundaryMarker = {
  assertPhiFlagged,
  getDeclaredBoundary,
  socScopeBoundaryId: "soc-scope-boundary:default",
  socScopeBoundaryKey: "soc-scope-boundary:default",
  containsVerticalComplianceLogic: false,
  executable: false,
};
