/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const INDUSTRY = path.join(root, "lib/intelligence/synthetic/industry/construction");
const LIB = path.join(root, "lib/intelligence/synthetic/libraries/construction");

function listTs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listTs(p) : p.endsWith(".ts") ? [p] : [];
  });
}

const files = [...listTs(INDUSTRY), ...listTs(LIB)].filter((f) => !f.includes(".test."));
let scattered = 0;
let structural = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (/containsConstructionContractData:\s*true/.test(src)) scattered += 1;
  if (src.includes("assertContainsConstructionContractData")) structural += 1;
}

const industryOnly = listTs(INDUSTRY).filter((f) => !f.includes(".test."));
let industryScattered = 0;
for (const f of industryOnly) {
  const src = fs.readFileSync(f, "utf8");
  if (/@doctrine containsConstructionContractData/.test(src)) industryScattered += 1;
  if (/\/\*\*[\s\S]*?containsConstructionContractData:\s*true/.test(src)) industryScattered += 1;
}

console.log(`CON-2 doctrine lift: industry scattered=${industryScattered} structural=${structural}`);
if (industryScattered > 0) {
  console.error("FAIL: scattered containsConstructionContractData remains in industry/construction");
  process.exit(1);
}
if (structural < 10) {
  console.error("FAIL: insufficient structural doctrine assertions");
  process.exit(1);
}
process.exit(0);
