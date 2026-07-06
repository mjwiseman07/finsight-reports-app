import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

test("no direct inserts into ledger_events outside publishEvent()", () => {
  const root = path.resolve(__dirname, "../..");
  const violations: string[] = [];
  const allowedFiles = ["lib/events/publisher.ts"];
  const skipDirs = new Set(["node_modules", ".next", "scripts"]);

  for (const file of walk(root)) {
    const rel = path.relative(root, file);
    if (rel.split(path.sep).some((seg) => skipDirs.has(seg))) continue;
    if (allowedFiles.some((a) => file.endsWith(a.replace(/\//g, path.sep)))) continue;
    if (/\.test\.tsx?$/.test(file)) continue;
    const src = readFileSync(file, "utf8");
    if (/\.from\(['"]ledger_events['"]\)\s*\.insert/.test(src)) {
      violations.push(file);
    }
  }

  expect(violations).toEqual([]);
});
