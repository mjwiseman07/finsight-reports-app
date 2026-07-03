import { createHash } from "crypto";

/**
 * Stable hash across runs. Sort keys, stringify, SHA256.
 * Used by curated_rule_fires_dedup_idx unique constraint.
 */
export function computeInputsHash(
  ruleId: string,
  targetType: string,
  targetRef: string,
  inputs: Record<string, unknown>,
): string {
  const canonical = JSON.stringify(
    { ruleId, targetType, targetRef, inputs },
    Object.keys({ ruleId, targetType, targetRef, ...inputs }).sort(),
  );
  return createHash("sha256").update(canonical).digest("hex");
}
