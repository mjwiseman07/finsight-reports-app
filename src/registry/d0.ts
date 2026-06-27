export const D0 = {
  cascadeStatus: "COMPLETE-9-VERTICAL-W2-ALL" as const,
  verticalCount: 9,
  verticalsW2Sealed: 9,
  verticalsW2Pending: 0,
  verticalWaveStatus: {
    FA: "W2",
    HC: "W2",
    GC: "W2",
    CON: "W2",
    PS: "W2",
    SAAS: "W2",
    NPO: "W2",
    MFG: "W2",
    RTL: "W2",
  },
  auditChannelInventory: {
    base: 11,
    mfgOnly: ["manufacturing-cost-audit"] as const,
    rtlOnly: [] as const,
  },
  cascadeClosureSealedAt: "LOCK-RTL-2" as const,
};
