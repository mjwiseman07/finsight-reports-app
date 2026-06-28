import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GapEntry } from "../../../scripts/external-truth/types";
import { EmitterPathMismatchError } from "./errors";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "emitter-path-integrity";

const NPO_C7A4_GAPS = ["GAP-0135", "GAP-0138", "GAP-0141", "GAP-0143", "GAP-0145"] as const;
const GOVCON_C7A8_GAPS = [
  "GAP-0064",
  "GAP-0065",
  "GAP-0068",
  "GAP-0069",
  "GAP-0072",
  "GAP-0073",
  "GAP-0076",
  "GAP-0077",
] as const;

export function assertionIdFromMessage(message: string): string {
  const topic = message.split(":")[0] ?? message;
  const parts = topic.split("/");
  return parts[parts.length - 1] ?? topic;
}

export function emitterContainsAssertionHook(source: string, assertionId: string): boolean {
  return (
    source.includes(`assertionId: "${assertionId}"`) ||
    source.includes(`assertionId:'${assertionId}'`) ||
    source.includes(`"${assertionId}"`)
  );
}

export function validateEmitterPathIntegrity(ctx: CrossoverContext): CrossoverValidatorResult {
  const root = ctx.repoRoot ?? process.cwd();
  const failures: string[] = [];
  const checked: string[] = [];

  for (const gap of ctx.register.gaps) {
    if (gap.triage !== "satisfied") {
      continue;
    }
    if (gap.closure_mechanism === "assertion-pack-scope-precondition") {
      continue;
    }
    if (!gap.emitter_path) {
      failures.push(`${gap.id}: satisfied emitter-satisfaction gap missing emitter_path`);
      continue;
    }

    const abs = join(root, gap.emitter_path);
    if (!existsSync(abs)) {
      throw new EmitterPathMismatchError(gap.id, `emitter file not found: ${gap.emitter_path}`);
    }

    const source = readFileSync(abs, "utf8");
    const assertionId = gap.assertion_hook ?? assertionIdFromMessage(gap.message);
    if (!emitterContainsAssertionHook(source, assertionId)) {
      throw new EmitterPathMismatchError(
        gap.id,
        `assertion hook not found for ${assertionId} in ${gap.emitter_path}`,
      );
    }
    checked.push(gap.id);
  }

  for (const gapId of NPO_C7A4_GAPS) {
    const gap = ctx.register.gaps.find((g: GapEntry) => g.id === gapId);
    if (!gap || gap.emitter_path !== "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts") {
      failures.push(`${gapId}: NPO C7a-4 emitter path regression`);
    }
  }

  const govconEmitter = "lib/router/govcon/usgaap/indirectRateStructure.ts";
  for (const gapId of GOVCON_C7A8_GAPS) {
    const gap = ctx.register.gaps.find((g: GapEntry) => g.id === gapId);
    if (!gap || gap.emitter_path !== govconEmitter) {
      failures.push(`${gapId}: GovCon C7a-8 emitter path regression`);
    }
  }

  if (failures.length > 0) {
    throw new EmitterPathMismatchError("register", failures.join("; "));
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: true,
    detail: `checked ${checked.length} satisfied emitter paths (incl. C7a-4 NPO + C7a-8 GovCon regression)`,
  };
}
