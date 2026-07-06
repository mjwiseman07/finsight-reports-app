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

function* walkCashApp(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkCashApp(full);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) yield full;
  }
}

test("every cash_app.* ledger kind referenced in lib/cash-app is in the allowlist", async () => {
  const root = path.resolve(__dirname, "../../lib/cash-app");
  const referenced = new Set<string>();
  const patterns = [
    /publishCashAppEvent\(\s*["'](cash_app\.[a-z0-9_.]+)["']/g,
    /["'](cash_app\.[a-z0-9_.]+)["']/g,
  ];
  for (const file of walkCashApp(root)) {
    if (file.endsWith("publish-cash-app-event.ts")) continue;
    const src = readFileSync(file, "utf8");
    for (const kindPattern of patterns) {
      let m: RegExpExecArray | null;
      while ((m = kindPattern.exec(src)) !== null) {
        referenced.add(m[1]);
      }
    }
  }
  const { CASH_APP_EVENT_TYPES } = await import("@/lib/events/cash-app-catalog");
  const allowedSet = new Set(CASH_APP_EVENT_TYPES);
  const missing = [...referenced].filter((k) => !allowedSet.has(k as (typeof CASH_APP_EVENT_TYPES)[number]));
  expect(missing).toEqual([]);
  expect(referenced.size).toBeGreaterThanOrEqual(7);
});
