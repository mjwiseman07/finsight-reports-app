import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CollapseStepUndocumentedError } from "./errors";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "collapse-step-documentation";

function isCollapseStepDocumented(gapId: string, closedIn: string, root: string): boolean {
  const candidates = [
    join(root, `docs/decisions/Phase_G7_C7a/${closedIn}-execution.md`),
    join(root, `docs/decisions/Phase_G7_C7a/${closedIn}.md`),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) {
      continue;
    }
    const text = readFileSync(path, "utf8");
    if (/reclassified|collapse-step|doc-lim.*fix-now/i.test(text)) {
      return true;
    }
  }
  return false;
}

export function validateCollapseStepDocumentation(ctx: CrossoverContext): CrossoverValidatorResult {
  const root = ctx.repoRoot ?? process.cwd();
  let checked = 0;

  for (const gap of ctx.register.gaps) {
    if (!gap.reclassified_in || !gap.closed_in || gap.reclassified_in !== gap.closed_in) {
      continue;
    }
    checked += 1;
    if (gap.collapse_step === true) {
      continue;
    }
    if (!isCollapseStepDocumented(gap.id, gap.closed_in, root)) {
      throw new CollapseStepUndocumentedError(gap.id);
    }
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: true,
    detail: `validated ${checked} same-commit reclassify+close gaps`,
  };
}
