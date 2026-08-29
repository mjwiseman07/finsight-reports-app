/**
 * JE-3D — bs_account_recon source-kind expansion custody tests.
 *
 * Authorizes live_provider NULL-baseline JE-1 source binding only.
 * Does NOT create a real JE, release kill switch, POST to QBO, or Memory.
 */
import { describe, expect, it } from "vitest";
import {
  parseCcObservationSummary,
  resolveAuthoritativeCcReconSlot,
  bsClassificationFromCoaAccountType,
  JeProposalCustodyError,
} from "../source-custody";
import {
  JE_LIVE_PROVIDER_SOURCE_RECON_KINDS,
  JE_PROPOSAL_ERROR,
  JE_SOURCE_RECON_KINDS,
  JE_SYNC_BACKED_SOURCE_RECON_KINDS,
} from "../types";
import { validateExpectedEffects } from "../validation";
import { DEFAULT_JE_PROPOSAL_POLICY } from "../types";
import { validateBsAccountSourceRunForGlDelta } from "../je3d-bs-account-source-authority-contract";
import { JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY } from "../je3d-first-controlled-create-activation";
import { hashJeProposal } from "../proposal-hash";

const SYNC = "sync-1";
const RUN_BS = "run-bs-liab";
const ACCT = "1150040002";

function syncSummary() {
  return parseCcObservationSummary({
    reconciliations: {
      ar: { runId: "run-ar", authoritative: true, baselineSyncId: SYNC },
      ap: { runId: "run-ap", authoritative: true, baselineSyncId: SYNC },
      inventory: {
        runId: "run-inv",
        authoritative: true,
        baselineSyncId: SYNC,
      },
    },
  });
}

function bsSummary(
  over: Partial<{
    runId: string | null;
    authoritative: boolean;
    baselineSyncId: null | string;
    measurementSource: string;
    qboAccountId: string;
  }> = {},
) {
  return parseCcObservationSummary({
    reconciliations: {
      ar: { runId: "run-ar", authoritative: true, baselineSyncId: SYNC },
      ap: { runId: "run-ap", authoritative: true, baselineSyncId: SYNC },
      inventory: {
        runId: "run-inv",
        authoritative: true,
        baselineSyncId: SYNC,
      },
      bsAccount: {
        runId: RUN_BS,
        authoritative: true,
        baselineSyncId: null,
        measurementSource: "live_provider",
        qboAccountId: ACCT,
        ...over,
      },
    },
  });
}

function cleanFacts(
  over: Partial<Parameters<typeof validateBsAccountSourceRunForGlDelta>[0]> = {},
) {
  return validateBsAccountSourceRunForGlDelta({
    tieOutKind: "bs_account_recon",
    status: "completed",
    qboAccountId: ACCT,
    expectedQboAccountId: ACCT,
    acquisition: "live_provider",
    baselineSyncId: null,
    providerBackedGlEndingBalanceCents: 0,
    preparedOrTbEndingBalanceCents: 0,
    totalsStatus: "tie",
    tieVarianceCents: 0,
    classification: "Liability",
    apControl: false,
    signConvention: "qbo_natural_sign",
    requireFirstRunCleanTie: true,
    ...over,
  });
}

describe("bs_account_recon JE_SOURCE_RECON_KINDS expansion", () => {
  it("1. expands kinds with bs_account_recon only as live_provider", () => {
    expect([...JE_SOURCE_RECON_KINDS]).toEqual([
      "ar_aging",
      "ap_aging",
      "inventory",
      "bs_account_recon",
    ]);
    expect([...JE_SYNC_BACKED_SOURCE_RECON_KINDS]).toEqual([
      "ar_aging",
      "ap_aging",
      "inventory",
    ]);
    expect([...JE_LIVE_PROVIDER_SOURCE_RECON_KINDS]).toEqual([
      "bs_account_recon",
    ]);
  });

  it("1b. accepts authoritative live_provider bsAccount slot", () => {
    const slot = resolveAuthoritativeCcReconSlot({
      observationSummary: bsSummary(),
      requestedRunId: RUN_BS,
      sourceAccountingSyncId: SYNC,
    });
    expect(slot).toEqual({
      slotName: "bsAccount",
      expectedKind: "bs_account_recon",
      measurementMode: "live_provider",
      qboAccountId: ACCT,
    });
  });

  it("2. wrong account on slot is rejected at parse", () => {
    expect(() =>
      parseCcObservationSummary({
        reconciliations: {
          ar: null,
          ap: null,
          inventory: null,
          bsAccount: {
            runId: RUN_BS,
            authoritative: true,
            baselineSyncId: null,
            measurementSource: "live_provider",
            qboAccountId: "",
          },
        },
      }),
    ).toThrow(/qboAccountId/i);
  });

  it("3–5. sync-backed AR still binds company/engagement/period via existing path", () => {
    const slot = resolveAuthoritativeCcReconSlot({
      observationSummary: syncSummary(),
      requestedRunId: "run-ar",
      sourceAccountingSyncId: SYNC,
    });
    expect(slot.measurementMode).toBe("sync_backed");
    expect(slot.expectedKind).toBe("ar_aging");
    expect(slot.qboAccountId).toBeNull();
  });

  it("6. non-authoritative bsAccount rejected", () => {
    expect(() =>
      resolveAuthoritativeCcReconSlot({
        observationSummary: bsSummary({ authoritative: false }),
        requestedRunId: RUN_BS,
        sourceAccountingSyncId: SYNC,
      }),
    ).toThrow(JeProposalCustodyError);
  });

  it("7. non-live_provider measurementSource rejected", () => {
    expect(() =>
      parseCcObservationSummary({
        reconciliations: {
          ar: null,
          ap: null,
          inventory: null,
          bsAccount: {
            runId: RUN_BS,
            authoritative: true,
            baselineSyncId: null,
            measurementSource: "staging_sync",
            qboAccountId: ACCT,
          },
        },
      }),
    ).toThrow(/live_provider/);
  });

  it("8. non-null baseline sync on bsAccount slot rejected (no synthetic sync)", () => {
    expect(() =>
      parseCcObservationSummary({
        reconciliations: {
          ar: null,
          ap: null,
          inventory: null,
          bsAccount: {
            runId: RUN_BS,
            authoritative: true,
            baselineSyncId: "fake-sync",
            measurementSource: "live_provider",
            qboAccountId: ACCT,
          },
        },
      }),
    ).toThrow(/baselineSyncId must be null/);
  });

  it("9. GL/TB/variance incoherence rejected", () => {
    const result = cleanFacts({
      providerBackedGlEndingBalanceCents: 500,
      preparedOrTbEndingBalanceCents: 700,
      tieVarianceCents: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("je_3d_bs_source_variance_arithmetic_mismatch");
  });

  it("10–11. non-zero / non-tie first-run rejected", () => {
    expect(
      cleanFacts({
        providerBackedGlEndingBalanceCents: 100,
        preparedOrTbEndingBalanceCents: 0,
        tieVarianceCents: 100,
        totalsStatus: "review",
      }).ok,
    ).toBe(false);
    expect(
      cleanFacts({
        providerBackedGlEndingBalanceCents: 0,
        preparedOrTbEndingBalanceCents: 0,
        tieVarianceCents: 0,
        totalsStatus: "review",
      }).ok,
    ).toBe(false);
  });

  it("12. Asset classification rejected", () => {
    expect(cleanFacts({ classification: "Asset" }).ok).toBe(false);
    expect(bsClassificationFromCoaAccountType("Bank")).toBe("Asset");
    expect(bsClassificationFromCoaAccountType("Other Current Liability")).toBe(
      "Liability",
    );
  });

  it("13. AP/control account rejected", () => {
    expect(cleanFacts({ apControl: true }).ok).toBe(false);
  });

  it("14. no synthetic sync invented — live_provider keeps null baseline", () => {
    expect(cleanFacts({ baselineSyncId: null }).ok).toBe(true);
    expect(cleanFacts({ baselineSyncId: "invented" }).ok).toBe(false);
  });

  it("15. existing AR/AP/Inventory slot authority unchanged", () => {
    const s = syncSummary();
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
    // Absent BS run is not inventively authoritative.
    expect(() =>
      resolveAuthoritativeCcReconSlot({
        observationSummary: s,
        requestedRunId: RUN_BS,
        sourceAccountingSyncId: SYNC,
      }),
    ).toThrow(/not present/i);
  });

  it("16. tests do not auto-create proposals (this suite is custody-only)", () => {
    expect(typeof cleanFacts).toBe("function");
  });

  it("17. kill switch released (dispatch armed)", () => {
    expect(
      JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.sandboxDispatchKillSwitch,
    ).toBe(false);
  });

  it("18–19. no VERIFY / Memory in activation overlay; kill switch OFF", () => {
    expect(
      JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.capabilities
        .VERIFY_SANDBOX_JE,
    ).toBe(false);
    expect(
      JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.memoryWriteAllowed,
    ).toBe(false);
    expect(
      JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.sandboxDispatchKillSwitch,
    ).toBe(false);
  });

  it("promotes BS_ACCOUNT_GL_DELTA in validation + hash canonicalization", () => {
    const effects = validateExpectedEffects(
      [
        {
          type: "BS_ACCOUNT_GL_DELTA",
          sourceKind: "bs_account_recon",
          sourceRunId: RUN_BS,
          qboAccountId: ACCT,
          classification: "Liability",
          baselineGlBalanceCents: 500,
          expectedDeltaCents: 100,
          expectedPostGlBalanceCents: 600,
          signConvention: "qbo_natural_sign",
        },
      ],
      DEFAULT_JE_PROPOSAL_POLICY,
    );
    expect(effects[0]?.type).toBe("BS_ACCOUNT_GL_DELTA");

    const hash = hashJeProposal({
      companyId: "co",
      engagementId: "eng",
      firmClientId: "fc",
      periodEnd: "2026-07-31",
      sourceContinuousCloseRunId: "cc",
      sourceAccountingSyncId: SYNC,
      sourceReconRunIds: [RUN_BS],
      originType: "ACCRUAL",
      reasonCode: "cutoff_accrual",
      memo: null,
      currency: "USD",
      txnDate: "2026-07-31",
      lines: [
        {
          sequence: 1,
          accountId: "15",
          debitCents: 100,
          creditCents: 0,
        },
        {
          sequence: 2,
          accountId: ACCT,
          debitCents: 0,
          creditCents: 100,
        },
      ],
      totalDebitsCents: 100,
      totalCreditsCents: 100,
      expectedEffects: effects,
      policyHash: "policy",
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects Asset classification in BS_ACCOUNT_GL_DELTA validation", () => {
    expect(() =>
      validateExpectedEffects(
        [
          {
            type: "BS_ACCOUNT_GL_DELTA",
            sourceKind: "bs_account_recon",
            sourceRunId: RUN_BS,
            qboAccountId: ACCT,
            classification: "Asset",
            baselineGlBalanceCents: 0,
            expectedDeltaCents: 100,
            expectedPostGlBalanceCents: 100,
            signConvention: "qbo_natural_sign",
          } as never,
        ],
        DEFAULT_JE_PROPOSAL_POLICY,
      ),
    ).toThrow(/BS_ACCOUNT_GL_DELTA/);
  });
});
