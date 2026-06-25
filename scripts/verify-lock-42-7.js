/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7G — LOCK-42.7 structural verifier (8 checks).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const D0_PATH = path.join(root, "architecture-lane/d0-evidence/D0_WIRING_EVIDENCE.json");
const ATTESTATION_PATH = path.join(root, "LOCK_42_7_ATTESTATION.md");
const ATLAS_PATH = path.join(root, "docs/_atlas/Advisacor_Phase_Atlas_v1.md");
const INVENTORY_PATH = path.join(root, "docs/_compliance/Phase_42_7_Compliance_Inventory.md");

const TOP_LEVEL_KEYS = [
  "evidenceVersion",
  "generatedAt",
  "totalCases",
  "passCount",
  "failCount",
  "cases",
];
const PER_CASE_KEYS = ["id", "decision", "expected", "outcome", "reason"];

const steps = [
  {
    id: "LOCK-42.7-01",
    name: "D0_WIRING_EVIDENCE.json exists",
    run() {
      if (!fs.existsSync(D0_PATH)) {
        throw new Error("D0_WIRING_EVIDENCE.json missing");
      }
      return { status: "PASS", detail: D0_PATH };
    },
  },
  {
    id: "LOCK-42.7-02",
    name: "D0 file has exactly 6 top-level keys in documented order",
    run() {
      const evidence = JSON.parse(fs.readFileSync(D0_PATH, "utf8"));
      const keys = Object.keys(evidence);
      if (keys.join(",") !== TOP_LEVEL_KEYS.join(",")) {
        throw new Error(`top-level keys out of order: ${keys.join(",")}`);
      }
      return { status: "PASS", detail: "6-key top-level contract satisfied" };
    },
  },
  {
    id: "LOCK-42.7-03",
    name: "failCount == 0 AND passCount == totalCases == 48",
    run() {
      const evidence = JSON.parse(fs.readFileSync(D0_PATH, "utf8"));
      if (evidence.failCount !== 0) {
        throw new Error(`failCount must be 0, got ${evidence.failCount}`);
      }
      if (evidence.passCount !== evidence.totalCases) {
        throw new Error("passCount must equal totalCases");
      }
      if (evidence.totalCases !== 48) {
        throw new Error(`totalCases must be 48, got ${evidence.totalCases}`);
      }
      return { status: "PASS", detail: "48/48 pass, failCount=0" };
    },
  },
  {
    id: "LOCK-42.7-04",
    name: "every case has exactly 5 per-case keys in documented order",
    run() {
      const evidence = JSON.parse(fs.readFileSync(D0_PATH, "utf8"));
      for (const entry of evidence.cases) {
        const keys = Object.keys(entry);
        if (keys.join(",") !== PER_CASE_KEYS.join(",")) {
          throw new Error(`case ${entry.id} key order mismatch: ${keys.join(",")}`);
        }
      }
      return { status: "PASS", detail: `${evidence.cases.length} cases validated` };
    },
  },
  {
    id: "LOCK-42.7-05",
    name: 'every case outcome is strictly "pass" or "fail"',
    run() {
      const evidence = JSON.parse(fs.readFileSync(D0_PATH, "utf8"));
      const invalid = evidence.cases.filter(
        (entry) => entry.outcome !== "pass" && entry.outcome !== "fail",
      );
      if (invalid.length > 0) {
        throw new Error(`invalid outcomes: ${invalid.map((entry) => entry.id).join(", ")}`);
      }
      return { status: "PASS", detail: "strict pass/fail outcomes only" };
    },
  },
  {
    id: "LOCK-42.7-06",
    name: "LOCK_42_7_ATTESTATION.md exists and is signed",
    run() {
      if (!fs.existsSync(ATTESTATION_PATH)) {
        throw new Error("LOCK_42_7_ATTESTATION.md missing");
      }
      const content = fs.readFileSync(ATTESTATION_PATH, "utf8");
      if (!content.includes("mwiseman@advisacor.com")) {
        throw new Error("attestation missing mwiseman@advisacor.com");
      }
      return { status: "PASS", detail: "LOCK_42_7_ATTESTATION.md present" };
    },
  },
  {
    id: "LOCK-42.7-07",
    name: "Atlas frozen at docs/_atlas/Advisacor_Phase_Atlas_v1.md v1.2.8",
    run() {
      if (!fs.existsSync(ATLAS_PATH)) {
        throw new Error("frozen Atlas missing");
      }
      const firstLine = fs.readFileSync(ATLAS_PATH, "utf8").split(/\r?\n/)[0];
      if (firstLine !== "# Advisacor Phase Atlas — v1.2.8") {
        throw new Error(`unexpected Atlas header: ${firstLine}`);
      }
      return { status: "PASS", detail: "Atlas v1.2.8 frozen" };
    },
  },
  {
    id: "LOCK-42.7-08",
    name: "Compliance Inventory frozen v1.6",
    run() {
      if (!fs.existsSync(INVENTORY_PATH)) {
        throw new Error("frozen Compliance Inventory missing");
      }
      const content = fs.readFileSync(INVENTORY_PATH, "utf8");
      if (!content.includes("## 12. Document control")) {
        throw new Error("Inventory missing document control section");
      }
      if (!content.includes("**Version**: 1.6")) {
        throw new Error("Inventory version 1.6 not found");
      }
      return { status: "PASS", detail: "Compliance Inventory v1.6 frozen" };
    },
  },
];

function main() {
  let failures = 0;
  for (const step of steps) {
    try {
      const result = step.run();
      console.log(`PASS ${step.id} ${step.name} — ${result.detail}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${step.id} ${step.name}:`, error.message || error);
    }
  }
  if (failures > 0) {
    console.error(`LOCK-42.7 verification failed (${failures}/${steps.length} checks).`);
    process.exit(1);
  }
  console.log(`LOCK-42.7 verification passed (${steps.length}/${steps.length} checks).`);
}

main();
