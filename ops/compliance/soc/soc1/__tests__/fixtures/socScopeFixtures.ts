/** Synthetic boundary diagram fixtures — tag-only. containsVerticalComplianceLogic: false executable: false */

export const POISON_UNFLAGGED_PHI_NODE = {
  nodeId: "node:probe-unflagged-phi",
  namespace: "ops/compliance/overlays/hipaa/integration",
  dataTags: [{ taxonomy: "patient-identifier", phi: true, socScopeFlagged: false }],
} as const;
