/**
 * Affected-scope selection for JE-4 recomputation.
 *
 * Prefer proposal source recon kinds + expected-effect kinds. The existing
 * authoritative observation entrypoint is trio-scoped (AR + AP + Inventory)
 * and Continuous Close OBSERVE persistence requires that complete snapshot
 * trio, so JE-4 does not invent a subset reconciliation engine.
 *
 * bs_account_recon stays a live-provider kind (null baseline_sync_id). Its
 * post-write proof is the SUCCESS sync trial-balance balance, not
 * regenerate-run and not a synthetic sync baseline.
 */

import type { JeExpectedEffect } from "./types";

export type PostWriteRecomputeScope = {
  recomputeMode: "authoritative_trio";
  affectedReconKinds: string[];
  uncertain: boolean;
  tieOut: "snapshot_backed_inside_observation";
  reason: string;
};

const TRIO_REASON_UNCERTAIN =
  "Affected recon set is incomplete (exception clear, reclass, or missing source kinds). " +
  "Recompute uses the existing AR+AP+Inventory authoritative trio because that entrypoint " +
  "is not subset-selectable and Continuous Close OBSERVE requires the complete snapshot trio. " +
  "BS GL proof uses the SUCCESS sync trial balance. Live regenerate-run is not invoked.";

const TRIO_REASON_RESOLVED =
  "Affected kinds come from proposal source recon kinds and expected effects. " +
  "Recompute still uses the authoritative trio: observation has no kind filter, and " +
  "OBSERVE persistence requires the complete trio. bs_account_recon remains live-provider " +
  "(null baseline) and is proven from canonical GL, not a synthetic sync baseline. " +
  "Live regenerate-run is not invoked.";

export function selectPostWriteRecomputeScope(args: {
  expectedEffects: readonly JeExpectedEffect[];
  sourceReconKinds: readonly string[];
}): PostWriteRecomputeScope {
  const kinds = new Set<string>();
  let uncertain = args.sourceReconKinds.length === 0;

  for (const kind of args.sourceReconKinds) {
    const text = String(kind || "").trim();
    if (text) kinds.add(text);
  }

  for (const effect of args.expectedEffects) {
    if (
      effect.type === "RECON_OUTCOME_TARGET" ||
      effect.type === "RESIDUAL_DELTA"
    ) {
      kinds.add(String(effect.reconKind).trim());
    } else if (effect.type === "BS_ACCOUNT_GL_DELTA") {
      kinds.add("bs_account_recon");
    } else {
      uncertain = true;
    }
  }

  if (kinds.size === 0) uncertain = true;

  return {
    recomputeMode: "authoritative_trio",
    affectedReconKinds: [...kinds].sort((a, b) => a.localeCompare(b)),
    uncertain,
    tieOut: "snapshot_backed_inside_observation",
    reason: uncertain ? TRIO_REASON_UNCERTAIN : TRIO_REASON_RESOLVED,
  };
}
