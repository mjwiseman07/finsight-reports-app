import fs from "node:fs";
import path from "node:path";

export type BaselineDiff = {
  figuresChanged: number;
  citationsChanged: number;
  notes: string[];
};

export function diffBaseline(disclosure: unknown, baselinePath: string): BaselineDiff {
  const absPath = path.resolve(baselinePath);
  if (!fs.existsSync(absPath)) {
    return {
      figuresChanged: 0,
      citationsChanged: 0,
      notes: [`No baseline found at ${baselinePath} — treating all output as informational`],
    };
  }
  const baseline = JSON.parse(fs.readFileSync(absPath, "utf-8")) as unknown;
  const diffs = shallowDiff(baseline, disclosure);
  return {
    figuresChanged: diffs.figureDiffs,
    citationsChanged: diffs.citationDiffs,
    notes: diffs.notes,
  };
}

function shallowDiff(
  baseline: unknown,
  current: unknown,
): { figureDiffs: number; citationDiffs: number; notes: string[] } {
  let figureDiffs = 0;
  let citationDiffs = 0;
  const notes: string[] = [];

  function walk(b: unknown, c: unknown, pathStr: string) {
    if (b == null && c == null) return;
    if (b == null || c == null) {
      notes.push(
        `Presence diff at ${pathStr}: baseline=${b ? "present" : "absent"} current=${c ? "present" : "absent"}`,
      );
      return;
    }
    if (typeof b !== typeof c) {
      notes.push(`Type diff at ${pathStr}`);
      return;
    }
    if (typeof b === "object" && !Array.isArray(b)) {
      const bObj = b as Record<string, unknown>;
      const cObj = c as Record<string, unknown>;
      const keys = new Set([...Object.keys(bObj), ...Object.keys(cObj)]);
      for (const k of keys) walk(bObj[k], cObj[k], `${pathStr}.${k}`);
    } else if (Array.isArray(b) && Array.isArray(c)) {
      if (b.length !== c.length) {
        notes.push(`Array length diff at ${pathStr}: ${b.length} → ${c.length}`);
      }
      for (let i = 0; i < Math.max(b.length, c.length); i += 1) {
        walk(b[i], c[i], `${pathStr}[${i}]`);
      }
    } else if (b !== c) {
      if (typeof b === "number") figureDiffs += 1;
      else if (pathStr.toLowerCase().includes("cite") || pathStr.toLowerCase().includes("citation")) {
        citationDiffs += 1;
      }
    }
  }

  walk(baseline, current, "$");
  return { figureDiffs, citationDiffs, notes };
}
