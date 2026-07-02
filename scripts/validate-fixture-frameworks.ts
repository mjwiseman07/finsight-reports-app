/**
 * CI validator — scans JSON fixtures and asserts that every
 * `gaapBasis` and `framework` field contains a canonical
 * RouterFramework value. Fails CI if a fixture drifts from
 * canonical spelling.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { RouterFramework } from "./external-truth/types";

const CANONICAL: readonly RouterFramework[] = [
  "us-gaap",
  "ifrs",
  "ifrs-for-smes",
  "ipsas",
  "unknown",
] as const;

const CANONICAL_SET: Set<string> = new Set(CANONICAL);

const FIXTURE_ROOTS = ["fixtures/mock-cos", "fixtures/scenarios"];

const LEGACY_ALLOWLIST = new Set<string>([
  "fixtures/baselines/BANK-01-pre-G8b.json",
]);

let errors: string[] = [];

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const s = statSync(path);
    if (s.isDirectory()) walk(path);
    else if (path.endsWith(".json") && !LEGACY_ALLOWLIST.has(path.replace(/\\/g, "/"))) {
      check(path);
    }
  }
}

function check(path: string) {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return;
  }
  walkJson(json, path, "");
}

function walkJson(value: unknown, path: string, keyPath: string) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkJson(v, path, `${keyPath}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((k === "gaapBasis" || k === "framework") && typeof v === "string") {
        if (!CANONICAL_SET.has(v)) {
          errors.push(`  ${path}${keyPath}.${k} = ${JSON.stringify(v)} (not canonical)`);
        }
      }
      walkJson(v, path, `${keyPath}.${k}`);
    }
  }
}

for (const root of FIXTURE_ROOTS) {
  try {
    walk(root);
  } catch {
    // dir may not exist
  }
}

if (errors.length) {
  console.error("Non-canonical framework values found in fixtures:");
  console.error(errors.join("\n"));
  process.exit(1);
} else {
  console.log("All fixture framework values are canonical.");
}
