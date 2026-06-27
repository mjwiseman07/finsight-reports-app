export const D0 = {
  cascadeStatus: "COMPLETE-9-VERTICAL-W2-MFG" as const,
  verticalCount: 9,
  verticalsW2Sealed: 8,
  verticalsW2Pending: 1,
  verticalWaveStatus: {
    FA: "W2",
    HC: "W2",
    GC: "W2",
    CON: "W2",
    PS: "W2",
    SAAS: "W2",
    NPO: "W2",
    MFG: "W2",
    RTL: "W1",
  },
  auditChannelInventory: {
    base: 11,
    mfgOnly: ["manufacturing-cost-audit"] as const,
  },
};
