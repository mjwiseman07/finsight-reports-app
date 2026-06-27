import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { IntegrationScenario, ScenarioCategory } from "../types";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export async function loadScenarios(
  categoryFilter: ScenarioCategory | null,
): Promise<IntegrationScenario[]> {
  const scenariosRoot = join(repoRoot, "tests/integration/scenarios");
  const paths: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (categoryFilter && entry !== categoryFilter && !full.includes(categoryFilter)) {
          const rel = full.replace(scenariosRoot, "").replace(/\\/g, "/");
          if (!rel.startsWith(`/${categoryFilter}`)) {
            walk(full);
            continue;
          }
        }
        walk(full);
        continue;
      }
      if (entry.endsWith(".ts") && entry !== ".gitkeep") {
        paths.push(full);
      }
    }
  };

  try {
    walk(scenariosRoot);
  } catch {
    return [];
  }

  const scenarios: IntegrationScenario[] = [];
  for (const filePath of paths.sort()) {
    if (categoryFilter && !filePath.replace(/\\/g, "/").includes(`/scenarios/${categoryFilter}/`)) {
      continue;
    }
    const mod = (await import(pathToFileURL(filePath).href)) as { scenario?: IntegrationScenario };
    if (mod.scenario) {
      scenarios.push(mod.scenario);
    }
  }

  return scenarios.sort((a, b) => a.id.localeCompare(b.id));
}
