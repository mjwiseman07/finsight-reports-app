import { EntityFrameworkComminglingError } from "./errors";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export const VALIDATOR_NAME = "framework-consistency";

export function validateFrameworkConsistency(ctx: CrossoverContext): CrossoverValidatorResult {
  const byEntity = new Map<string, Set<string>>();
  for (const disclosure of ctx.disclosures) {
    if (!disclosure.framework) {
      throw new EntityFrameworkComminglingError(disclosure.entityId, ["<missing>"]);
    }
    const set = byEntity.get(disclosure.entityId) ?? new Set<string>();
    set.add(disclosure.framework);
    byEntity.set(disclosure.entityId, set);
  }

  for (const [entityId, frameworks] of byEntity) {
    if (frameworks.size > 1) {
      throw new EntityFrameworkComminglingError(entityId, [...frameworks]);
    }
  }

  return {
    validator: VALIDATOR_NAME,
    passed: true,
    haltOnFailure: true,
    detail: `checked ${ctx.disclosures.length} disclosures across ${byEntity.size} entities`,
  };
}
