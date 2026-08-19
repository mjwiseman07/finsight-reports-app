import { describe, expect, it } from "vitest";
import type { AuthoritativeObservationResult } from "@/lib/audit-ready/authoritative-observation/types";
import { DEFAULT_OBSERVE_POLICY } from "@/lib/continuous-close/policy";
import {
  mapAuthoritativeObservationToUrmInputs,
  type AuthoritativeUrmRunFacts,
} from "../authoritative-urm-mapper";

const SYNC = "11111111-1111-4111-8111-111111111111";

function slot(over: Partial<NonNullable<AuthoritativeObservationResult["reconciliations"]["ar"]>> = {}) {
  return {
    runId: "run-ar",
    status: "completed" as const,
    totalsStatus: "tie" as const,
    baselineSyncId: SYNC,
    measurementSource: "persisted_sync_snapshot" as const,
    authoritative: true,
    ...over,
  };
}

function observation(
  over: Partial<AuthoritativeObservationResult> = {},
): AuthoritativeObservationResult {
  return {
    observationId: "obs-1",
    acquisitionId: null,
    mode: "REPLAY_EXISTING_SYNC",
    accountingSyncId: SYNC,
    companyId: "co-1",
    engagementId: "eng-1",
    periodEnd: "2026-07-31",
    status: "completed",
    reconciliations: {
      ar: slot({ runId: "run-ar" }),
      ap: slot({ runId: "run-ap" }),
      inventory: slot({ runId: "run-inv" }),
    },
    custody: {
      allSameSync: true,
      snapshotsPresent: ["ar_aging", "ap_aging", "inventory"],
    },
    failures: [],
    ...over,
  };
}

function facts(
  kind: "ar_aging" | "ap_aging" | "inventory",
  runId: string,
  over: Partial<AuthoritativeUrmRunFacts> = {},
): AuthoritativeUrmRunFacts {
  return {
    runId,
    tieOutKind: kind,
    periodEnd: "2026-07-31",
    reconOutcome: "reconciled_exact",
    grossVarianceCents: 0,
    identifiedTotalCents: 0,
    unidentifiedResidualCents: 0,
    baselineSyncId: SYNC,
    itemIds: [`item-${runId}`],
    ...over,
  };
}

const policy = {
  ...DEFAULT_OBSERVE_POLICY,
  requiredReconKinds: ["ar_aging", "ap_aging", "inventory"],
};

describe("authoritative URM mapper", () => {
  it("maps AR/AP/Inventory canonical fields from persisted facts", async () => {
    const byId: Record<string, AuthoritativeUrmRunFacts> = {
      "run-ar": facts("ar_aging", "run-ar", {
        grossVarianceCents: 12,
        identifiedTotalCents: 4,
        unidentifiedResidualCents: 8,
      }),
      "run-ap": facts("ap_aging", "run-ap"),
      "run-inv": facts("inventory", "run-inv"),
    };
    const { urmInputs, selectedUrmRuns } = await mapAuthoritativeObservationToUrmInputs({
      observation: observation(),
      policy,
      deps: {
        loadRunFacts: async (id) => byId[id] ?? null,
        countEvidence: async (ids) => ids.length,
      },
    });
    const ar = urmInputs.find((row) => row.workpaperKind === "ar_aging");
    expect(ar).toMatchObject({
      workpaperId: "run-ar",
      urmRunId: "run-ar",
      outcome: "reconciled_exact",
      grossVarianceCents: 12,
      identifiedTotalCents: 4,
      unidentifiedResidualCents: 8,
      materialityThresholdCents: null,
      evidenceCount: 1,
      sourceAccountingSyncId: SYNC,
      asOfDate: "2026-07-31",
      required: true,
    });
    expect(urmInputs.map((row) => row.workpaperKind)).toEqual([
      "ar_aging",
      "ap_aging",
      "inventory",
    ]);
    expect(selectedUrmRuns).toEqual({
      ar_aging: "run-ar",
      ap_aging: "run-ap",
      inventory: "run-inv",
    });
  });

  it("omits non-authoritative and live_provider slots", async () => {
    const { urmInputs } = await mapAuthoritativeObservationToUrmInputs({
      observation: observation({
        reconciliations: {
          ar: slot({ authoritative: false }),
          ap: slot({
            runId: "run-ap",
            measurementSource: "live_provider",
            authoritative: true,
          }),
          inventory: null,
        },
      }),
      policy,
      deps: {
        loadRunFacts: async () => facts("ar_aging", "run-ar"),
        countEvidence: async () => 0,
      },
    });
    expect(urmInputs).toEqual([]);
  });

  it("omits baseline sync mismatch", async () => {
    const { urmInputs } = await mapAuthoritativeObservationToUrmInputs({
      observation: observation({
        reconciliations: {
          ar: slot({ baselineSyncId: "other-sync" }),
          ap: null,
          inventory: null,
        },
      }),
      policy,
      deps: {
        loadRunFacts: async () => facts("ar_aging", "run-ar"),
        countEvidence: async () => 0,
      },
    });
    expect(urmInputs).toEqual([]);
  });

  it("does not synthesize recon_outcome from totalsStatus", async () => {
    const { urmInputs } = await mapAuthoritativeObservationToUrmInputs({
      observation: observation({
        reconciliations: {
          ar: slot({ totalsStatus: "tie", runId: "run-ar" }),
          ap: null,
          inventory: null,
        },
      }),
      policy,
      deps: {
        loadRunFacts: async () => facts("ar_aging", "run-ar", { reconOutcome: null }),
        countEvidence: async () => 0,
      },
    });
    expect(urmInputs).toEqual([]);
  });

  it("materialityThresholdCents remains null", async () => {
    const { urmInputs } = await mapAuthoritativeObservationToUrmInputs({
      observation: observation({
        reconciliations: {
          ar: slot(),
          ap: null,
          inventory: null,
        },
      }),
      policy,
      deps: {
        loadRunFacts: async () => facts("ar_aging", "run-ar"),
        countEvidence: async () => 3,
      },
    });
    expect(urmInputs[0]?.materialityThresholdCents).toBeNull();
    expect(urmInputs[0]?.evidenceCount).toBe(3);
  });
});
