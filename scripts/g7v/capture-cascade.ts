import type { ExtractedFiling } from "../../scripts/external-truth/types";
import type { EmitterResult } from "../../lib/router/types";
import { CASCADE_STAGES } from "./verticals";

export type StageSkip = { stageId: number; reason: string };
export type StageEvent = { stageId: number; ts: string; fired: boolean; reason?: string };
export type CascadeTap = {
  recordStage: (stageId: number, fired: boolean, reason?: string) => void;
  firedStages: () => number[];
  skippedStages: () => StageSkip[];
  fullLog: () => StageEvent[];
};

export type CascadeWireMode = "emitter" | "logger" | "global-hook" | "router-proxy" | "silent";

export type CascadeWireResult = {
  tap: CascadeTap;
  mode: CascadeWireMode;
  detail: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __G7V_TAP__: CascadeTap | undefined;
}

export function captureCascade(): CascadeTap {
  const events: StageEvent[] = [];
  return {
    recordStage(stageId: number, fired: boolean, reason?: string) {
      events.push({ stageId, ts: new Date().toISOString(), fired, reason });
    },
    firedStages() {
      return events.filter((e) => e.fired).map((e) => e.stageId);
    },
    skippedStages() {
      return events
        .filter((e) => !e.fired)
        .map((e) => ({ stageId: e.stageId, reason: e.reason ?? "" }));
    },
    fullLog() {
      return [...events];
    },
  };
}

/**
 * Attempts to wire the LOCK-G7 cascade observation layer.
 * Discovery (G7-V Step 1): no src/disclosures/, src/cascade/, or src/memory/;
 * disclosure generation lives in lib/router/{vertical}/index.ts (run*Router).
 * No runtime 29-stage event emitter or structured cascade logger exists.
 */
export function wireCascadeTap(): CascadeWireResult {
  const tap = captureCascade();

  if (globalThis.__G7V_TAP__) {
    return {
      tap: globalThis.__G7V_TAP__,
      mode: "global-hook",
      detail: "Using pre-installed globalThis.__G7V_TAP__ observation hook",
    };
  }

  globalThis.__G7V_TAP__ = tap;

  return {
    tap,
    mode: "silent",
    detail:
      "No cascade event emitter or logger found; substrate is silent. " +
      "Entry point is lib/router/* run*Router — not a 29-stage runtime cascade.",
  };
}

export type RouterDisclosureObservation = {
  results: EmitterResult[];
  augmentedNarratives: string[];
};

/**
 * Records only directly observable signals from router output (harness-side proxy).
 * Does not modify LOCK-G7 substrate. Stages outside router scope are finalized as skipped.
 */
export function observeRouterDisclosureStages(
  tap: CascadeTap,
  disclosure: RouterDisclosureObservation,
  extracted: ExtractedFiling,
): number {
  const satisfied = disclosure.results.filter((r) => r.status === "satisfied");
  const lines = satisfied.flatMap((r) => r.lines);
  let fired = 0;

  function fire(stageId: number, reason: string) {
    if (tap.firedStages().includes(stageId)) return;
    tap.recordStage(stageId, true, reason);
    fired += 1;
  }

  if (satisfied.length > 0) {
    fire(14, "Router proxy: satisfied emitter(s) selected disclosure template path");
    fire(22, "Router proxy: industry-specific disclosure emitter(s) produced output");
  }

  if (lines.some((line) => /\d/.test(line.text))) {
    fire(15, "Router proxy: quantitative figures present in emitter lines");
  }

  if (disclosure.augmentedNarratives.length > extracted.narrativeSnippets.length) {
    fire(16, "Router proxy: qualitative narrative augmented by router");
  }

  if (lines.length > 0) {
    fire(18, "Router proxy: accounting policy / disclosure lines assembled");
  }

  if (
    lines.length > 0 &&
    lines.every(
      (line) =>
        line.citation.standard.trim().length > 0 && line.citation.paragraphs.length > 0,
    )
  ) {
    fire(24, "Router proxy: all satisfied emitter citations resolve to paragraph refs");
  }

  if (extracted.contract_revenue || satisfied.some((r) => /revenue|contract/i.test(r.emitterId))) {
    fire(7, "Router proxy: revenue recognition lane inputs evaluated");
  }

  if (extracted.leases) {
    fire(8, "Router proxy: lease classification inputs present (ASC 842 / IFRS 16 lane)");
  }

  if (extracted.inventory || extracted.manufacturing_inventory) {
    fire(9, "Router proxy: inventory valuation inputs present");
  }

  if (extracted.fund_accounting?.nav || extracted.fund_accounting?.holdings) {
    fire(10, "Router proxy: fair-value / holdings measurements present in fund inputs");
  }

  if (extracted.healthcare_revenue?.asc606?.allowance || extracted.receivables) {
    fire(11, "Router proxy: receivables / allowance inputs present");
  }

  if (extracted.govcon) {
    fire(22, "Router proxy: GovCon industry disclosure inputs routed");
  }

  if (satisfied.length > 0) {
    fire(29, "Router proxy: disclosure document materialized and serializable for audit hash");
  }

  finalizeUnobservedStages(
    tap,
    "Not exposed in lib/router disclosure entry path (no substrate stage emitter)",
  );

  return fired;
}

/** Marks stages with no fired event as skipped. */
export function finalizeUnobservedStages(tap: CascadeTap, skipReason: string): void {
  const fired = new Set(tap.firedStages());
  for (const stage of CASCADE_STAGES) {
    if (fired.has(stage.id)) continue;
    tap.recordStage(stage.id, false, `${skipReason} (tier ${stage.tier}: ${stage.name})`);
  }
}
