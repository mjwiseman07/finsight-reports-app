import type { CrossoverPairCode } from "./pairTypes";

export const CASCADE_STAGE_RANGE = [23, 24, 25, 26, 27, 28, 29] as const;
export type CascadeStageNumber = (typeof CASCADE_STAGE_RANGE)[number];

export const CASCADE_STAGE_NAMES: Record<CascadeStageNumber, string> = {
  23: "pair-detection",
  24: "per-pair-fixture-load",
  25: "per-pair-validator-dispatch",
  26: "cross-pair-register-reconciliation",
  27: "hybrid-disclosure-synthesis-emission",
  28: "per-pair-provenance-bundle-assembly",
  29: "pair-aware-lock-evidence-write",
};

export interface CascadeStageRecord {
  pairCode: CrossoverPairCode;
  stage: CascadeStageNumber;
  name: string;
  outcome: "pass" | "fail";
  metrics: Record<string, string | number | boolean>;
}

export interface CascadeEvidence {
  evidenceVersion: "G7.C7.W2.0";
  generatedAt: string;
  lockTag: string;
  commitSha: string;
  totalStageRuns: number;
  passCount: number;
  failCount: number;
  stages: CascadeStageRecord[];
}
