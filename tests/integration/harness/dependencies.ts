/** Maps kv-<vertical> cascade stage failures → dependent scenario IDs (Q-G3-C=A). */
export const SCENARIO_DEPENDENCIES: Record<string, readonly string[]> = {
  "kv-hc": ["C1-1", "C1-3", "C3-1", "C4-2"],
  "kv-npo": ["C1-1", "C1-3", "C3-1", "C4-3"],
  "kv-mfg": ["C1-2", "C2-1", "C3-3"],
  "kv-rtl": ["C1-2", "C2-1", "C3-3"],
  "kv-gc": ["C2-2"],
  "kv-ps": ["C2-2", "C4-1"],
  "kv-con": ["C2-3"],
  "kv-saas": ["C2-3", "C4-1", "C4-2"],
};

const BASE_DEPENDENCIES = ["tsc", "verifier", "control", "doctrine", "audit"] as const;

export function scenarioDependsOn(
  scenarioId: string,
  failedStages: ReadonlySet<string>,
): string | null {
  for (const base of BASE_DEPENDENCIES) {
    if (failedStages.has(base)) {
      return base;
    }
  }
  for (const [kvStage, scenarioIds] of Object.entries(SCENARIO_DEPENDENCIES)) {
    if (failedStages.has(kvStage) && scenarioIds.includes(scenarioId)) {
      return kvStage;
    }
  }
  return null;
}

export function scenariosForCategory(category: string): readonly string[] {
  const all = Object.values(SCENARIO_DEPENDENCIES).flat();
  return Object.freeze([...new Set(all)]);
}
