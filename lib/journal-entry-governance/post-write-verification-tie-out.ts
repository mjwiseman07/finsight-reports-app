/**
 * Snapshot-backed Tie-Out check for the post-write sync.
 *
 * Authoritative close truth requires persisted_sync_snapshot measurement and
 * baseline_sync_id equal to the new accounting sync. live_provider measurement
 * (including regenerate-run) is not a JE-4 close baseline.
 */

export type PostWriteTieOutSlot = {
  runId: string | null;
  authoritative: boolean;
  baselineSyncId: string | null;
  measurementSource: "persisted_sync_snapshot" | "live_provider" | null;
};

export type PostWriteTieOutObservation = {
  reconciliations: {
    ar: PostWriteTieOutSlot | null;
    ap: PostWriteTieOutSlot | null;
    inventory: PostWriteTieOutSlot | null;
  };
};

export type PostWriteTieOutResult =
  | { ok: true; tieOutRunIds: string[] }
  | { ok: false; code: string; message: string };

const SLOT_NAMES = ["ar", "ap", "inventory"] as const;

export function evaluateSnapshotBackedTieOut(args: {
  accountingSyncId: string;
  observation: PostWriteTieOutObservation;
}): PostWriteTieOutResult {
  const syncId = String(args.accountingSyncId || "").trim();
  if (!syncId) {
    return {
      ok: false,
      code: "je4_tie_out_sync_required",
      message: "Tie-out requires the post-write accounting sync id.",
    };
  }

  const runIds: string[] = [];
  for (const name of SLOT_NAMES) {
    const slot = args.observation.reconciliations[name];
    if (!slot || !slot.authoritative) {
      return {
        ok: false,
        code: "je4_tie_out_slot_not_authoritative",
        message: `${name} tie-out slot is not authoritative for the post-write sync.`,
      };
    }
    if (slot.measurementSource === "live_provider") {
      return {
        ok: false,
        code: "je4_tie_out_live_not_authoritative",
        message: `${name} live-provider tie-out is not the post-write close baseline.`,
      };
    }
    if (slot.measurementSource !== "persisted_sync_snapshot") {
      return {
        ok: false,
        code: "je4_tie_out_measurement_unproven",
        message: `${name} tie-out measurement source is not a persisted sync snapshot.`,
      };
    }
    if (slot.baselineSyncId !== syncId) {
      return {
        ok: false,
        code: "je4_tie_out_baseline_mismatch",
        message: `${name} baseline_sync_id does not match the post-write accounting sync.`,
      };
    }
    const runId = String(slot.runId || "").trim();
    if (!runId) {
      return {
        ok: false,
        code: "je4_tie_out_run_missing",
        message: `${name} tie-out run id is missing.`,
      };
    }
    runIds.push(runId);
  }

  return { ok: true, tieOutRunIds: runIds };
}
