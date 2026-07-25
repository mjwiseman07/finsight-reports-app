/**
 * Step 5: confirm dual-write is primary (no Block B/C swallow) across 7 resolvers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const emitCommon = readFileSync(
  resolve("lib/audit-ready/tie-out/emitters/_shared/emit-common.ts"),
  "utf8",
);

if (/try\s*\{[\s\S]*dualWriteWorkpaper[\s\S]*catch/.test(emitCommon)) {
  throw new Error("emit-common still wraps dualWrite in try/catch");
}
if (!emitCommon.includes("Failures propagate")) {
  throw new Error("emit-common missing maturity-gate comment");
}

const resolvers = [
  "ap-resolver.ts",
  "ar-resolver.ts",
  "inventory-resolver.ts",
  "grni-resolver.ts",
  "bs-account-resolver.ts",
  "fa-rollforward-resolver.ts",
  "bs-summary-resolver.ts",
];

for (const f of resolvers) {
  const src = readFileSync(resolve(`lib/audit-ready/tie-out/${f}`), "utf8");
  if (!src.includes("dualWriteWorkpaper")) {
    throw new Error(`${f} missing dualWriteWorkpaper call`);
  }
  // Banned: swallow that logs and continues (Block B/C pattern)
  const swallow =
    /dualWriteWorkpaper[\s\S]{0,200}?catch\s*\([^)]*\)\s*\{[\s\S]{0,300}?console\.error/;
  if (swallow.test(src)) {
    throw new Error(`${f} still has Block B/C dual-write swallow`);
  }
}

console.log(
  "HARDFAIL_GATE_OK: dualWriteWorkpaper primary in emit-common + 7 resolvers; no swallow",
);
