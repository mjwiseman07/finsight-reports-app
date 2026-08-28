import { describe, expect, it } from "vitest";
import {
  parseCcObservationSummary,
  resolveAuthoritativeCcReconSlot,
  JeProposalCustodyError,
} from "../source-custody";
import { JE_PROPOSAL_ERROR } from "../types";

const SYNC = "sync-1";

function summary(over: {
  ar?: Partial<{ runId: string | null; authoritative: boolean; baselineSyncId: string | null }>;
  ap?: Partial<{ runId: string | null; authoritative: boolean; baselineSyncId: string | null }>;
  inventory?: Partial<{
    runId: string | null;
    authoritative: boolean;
    baselineSyncId: string | null;
  }>;
  bsAccount?: Partial<{
    runId: string | null;
    authoritative: boolean;
    baselineSyncId: null;
    measurementSource: "live_provider";
    qboAccountId: string;
  }> | null;
} = {}) {
  const reconciliations: Record<string, unknown> = {
    ar: {
      runId: "run-ar",
      authoritative: true,
      baselineSyncId: SYNC,
      ...(over.ar || {}),
    },
    ap: {
      runId: "run-ap",
      authoritative: true,
      baselineSyncId: SYNC,
      ...(over.ap || {}),
    },
    inventory: {
      runId: "run-inv",
      authoritative: true,
      baselineSyncId: SYNC,
      ...(over.inventory || {}),
    },
  };
  if (over.bsAccount !== undefined) {
    reconciliations.bsAccount = over.bsAccount;
  }
  return parseCcObservationSummary({ reconciliations });
}

describe("CC observation_summary recon slot authority", () => {
  it("accepts authoritative AR / AP / Inventory slots", () => {
    const s = summary();
    expect(
      resolveAuthoritativeCcReconSlot({
        observationSummary: s,
        requestedRunId: "run-ar",
        sourceAccountingSyncId: SYNC,
      }).expectedKind,
    ).toBe("ar_aging");
    expect(
      resolveAuthoritativeCcReconSlot({
        observationSummary: s,
        requestedRunId: "run-ap",
        sourceAccountingSyncId: SYNC,
      }).expectedKind,
    ).toBe("ap_aging");
    expect(
      resolveAuthoritativeCcReconSlot({
        observationSummary: s,
        requestedRunId: "run-inv",
        sourceAccountingSyncId: SYNC,
      }).expectedKind,
    ).toBe("inventory");
  });

  it("rejects non-authoritative slot", () => {
    expect(() =>
      resolveAuthoritativeCcReconSlot({
        observationSummary: summary({ ar: { authoritative: false } }),
        requestedRunId: "run-ar",
        sourceAccountingSyncId: SYNC,
      }),
    ).toThrow(JeProposalCustodyError);
    try {
      resolveAuthoritativeCcReconSlot({
        observationSummary: summary({ ar: { authoritative: false } }),
        requestedRunId: "run-ar",
        sourceAccountingSyncId: SYNC,
      });
    } catch (error) {
      expect((error as JeProposalCustodyError).code).toBe(
        JE_PROPOSAL_ERROR.RECON_NOT_AUTHORITATIVE,
      );
    }
  });

  it("rejects runId mismatch / absent slot", () => {
    expect(() =>
      resolveAuthoritativeCcReconSlot({
        observationSummary: summary(),
        requestedRunId: "run-other",
        sourceAccountingSyncId: SYNC,
      }),
    ).toThrow(/not present/i);
  });

  it("rejects slot baselineSyncId mismatch", () => {
    expect(() =>
      resolveAuthoritativeCcReconSlot({
        observationSummary: summary({ ar: { baselineSyncId: "other-sync" } }),
        requestedRunId: "run-ar",
        sourceAccountingSyncId: SYNC,
      }),
    ).toThrow(JeProposalCustodyError);
  });

  it("rejects malformed/missing observation_summary", () => {
    expect(() => parseCcObservationSummary(null)).toThrow(/malformed/i);
    expect(() => parseCcObservationSummary({})).toThrow(/reconciliations/i);
  });

  it("accepts live_provider bsAccount with null baselineSyncId", () => {
    const slot = resolveAuthoritativeCcReconSlot({
      observationSummary: summary({
        bsAccount: {
          runId: "run-bs",
          authoritative: true,
          baselineSyncId: null,
          measurementSource: "live_provider",
          qboAccountId: "1150040002",
        },
      }),
      requestedRunId: "run-bs",
      sourceAccountingSyncId: SYNC,
    });
    expect(slot.expectedKind).toBe("bs_account_recon");
    expect(slot.measurementMode).toBe("live_provider");
    expect(slot.qboAccountId).toBe("1150040002");
  });

  it("rejects bsAccount with non-null baselineSyncId (no synthetic sync)", () => {
    expect(() =>
      summary({
        bsAccount: {
          runId: "run-bs",
          authoritative: true,
          baselineSyncId: null,
          measurementSource: "live_provider",
          qboAccountId: "1150040002",
        },
      }),
    ).not.toThrow();
    expect(() =>
      parseCcObservationSummary({
        reconciliations: {
          ar: null,
          ap: null,
          inventory: null,
          bsAccount: {
            runId: "run-bs",
            authoritative: true,
            baselineSyncId: "synthetic-sync",
            measurementSource: "live_provider",
            qboAccountId: "1150040002",
          },
        },
      }),
    ).toThrow(JeProposalCustodyError);
  });
});
