import type { GapRegister } from "../../../scripts/external-truth/types";

export interface CrossoverDisclosure {
  entityId: string;
  framework: string;
  emitterPath: string;
  text: string;
  assertionId?: string;
}

export interface CrossoverFootingPair {
  label: string;
  computed: number;
  referenced: number;
  tolerance: number;
  vertical?: "mfg" | "other" | "ifrs";
}

export interface CrossoverContext {
  disclosures: CrossoverDisclosure[];
  register: GapRegister;
  footingPairs?: CrossoverFootingPair[];
  repoRoot?: string;
}

export interface CrossoverValidatorResult {
  validator: string;
  passed: boolean;
  haltOnFailure: boolean;
  detail: string;
  warnings?: string[];
}

export type CrossoverValidator = (ctx: CrossoverContext) => CrossoverValidatorResult;
