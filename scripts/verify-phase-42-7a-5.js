/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7A.5 — Registry Change-Management Controls verifier (8 checks).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const CODEOWNERS_PATTERNS = [
  "architecture-lane/registries/**",
  "lib/intelligence/synthetic/panel-consumer/locked-citation-handles.ts",
  "lib/intelligence/synthetic/standards/audit/types.ts",
  "lib/intelligence/synthetic/standards/resolver/**",
  "/Phase_42_*.md",
  "/Phase_*_Build_Spec.md",
  "/Phase_42_7_Compliance_Inventory.md",
  "/Advisacor_Phase_Atlas_v1.md",
];

const PR_CHECKLIST_ITEMS = [
  "**Registry diff documented**",
  "**Citation handle named**",
  "**Audit schema impact assessed**",
  "**Doctrine bindings preserved**",
  "**Compliance impact documented**",
  "**Founder attestation complete**",
];

const REQUIRED_LOG_SECTIONS = [
  "**Commit SHA**:",
  "**Author**:",
  "**Reviewer**:",
  "**Change class**:",
  "**Affected files**:",
  "**Affected tenant population**:",
  "**Rationale**:",
  "**Citation / authoritative source**:",
  "**Risk impact**:",
  "**Verification**:",
  "**Founder attestation**:",
];

const REQUIRED_SCHEMA_PROPERTIES = [
  "heading",
  "commitSha",
  "author",
  "reviewer",
  "changeClass",
  "affectedFiles",
  "affectedTenantPopulation",
  "rationale",
  "citationSource",
  "riskImpact",
  "verification",
  "founderAttestation",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const steps = [
  {
    id: "42.7A.5-01",
    name: ".github/CODEOWNERS exists",
    run() {
      const filePath = path.join(root, ".github/CODEOWNERS");
      if (!fs.existsSync(filePath)) {
        throw new Error(".github/CODEOWNERS missing");
      }
      return { status: "PASS", detail: ".github/CODEOWNERS present" };
    },
  },
  {
    id: "42.7A.5-02",
    name: "CODEOWNERS contains all governance patterns from A5.D2",
    run() {
      const content = read(".github/CODEOWNERS");
      const missing = CODEOWNERS_PATTERNS.filter((pattern) => !content.includes(pattern));
      if (missing.length > 0) {
        throw new Error(`CODEOWNERS missing patterns: ${missing.join(", ")}`);
      }
      return { status: "PASS", detail: `${CODEOWNERS_PATTERNS.length} CODEOWNERS patterns present` };
    },
  },
  {
    id: "42.7A.5-03",
    name: ".github/pull_request_template.md exists",
    run() {
      if (!fs.existsSync(path.join(root, ".github/pull_request_template.md"))) {
        throw new Error("pull_request_template.md missing");
      }
      return { status: "PASS", detail: "pull_request_template.md present" };
    },
  },
  {
    id: "42.7A.5-04",
    name: "PR template contains all 6 mandatory checklist items",
    run() {
      const content = read(".github/pull_request_template.md");
      const missing = PR_CHECKLIST_ITEMS.filter((item) => !content.includes(item));
      if (missing.length > 0) {
        throw new Error(`PR template missing checklist items: ${missing.join("; ")}`);
      }
      if (!content.includes("mwiseman@advisacor.com")) {
        throw new Error("PR template missing founder reviewer reminder");
      }
      return { status: "PASS", detail: "all 6 mandatory PR checklist items present" };
    },
  },
  {
    id: "42.7A.5-05",
    name: "REGISTRY_CHANGE_LOG.md exists",
    run() {
      const filePath = path.join(root, "architecture-lane/registries/REGISTRY_CHANGE_LOG.md");
      if (!fs.existsSync(filePath)) {
        throw new Error("REGISTRY_CHANGE_LOG.md missing");
      }
      return { status: "PASS", detail: "REGISTRY_CHANGE_LOG.md present" };
    },
  },
  {
    id: "42.7A.5-06",
    name: "registry-change-log.schema.json exists",
    run() {
      const filePath = path.join(root, "architecture-lane/registries/registry-change-log.schema.json");
      if (!fs.existsSync(filePath)) {
        throw new Error("registry-change-log.schema.json missing");
      }
      return { status: "PASS", detail: "registry-change-log.schema.json present" };
    },
  },
  {
    id: "42.7A.5-07",
    name: "JSON schema defines all required entry sections",
    run() {
      const schemaPath = path.join(root, "architecture-lane/registries/registry-change-log.schema.json");
      const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
      const missing = REQUIRED_SCHEMA_PROPERTIES.filter(
        (property) => !schema.required?.includes(property),
      );
      if (missing.length > 0) {
        throw new Error(`schema missing required properties: ${missing.join(", ")}`);
      }
      if (schema.properties?.changeClass?.enum?.length !== 4) {
        throw new Error("schema changeClass enum incomplete");
      }
      return { status: "PASS", detail: "JSON schema with 11-section entry contract" };
    },
  },
  {
    id: "42.7A.5-08",
    name: "Change log contains at least one fully structured entry",
    run() {
      const content = read("architecture-lane/registries/REGISTRY_CHANGE_LOG.md");
      if (!content.includes("## [2026-06-24]")) {
        throw new Error("change log missing dated entry");
      }
      const missing = REQUIRED_LOG_SECTIONS.filter((section) => !content.includes(section));
      if (missing.length > 0) {
        throw new Error(`change log entry missing sections: ${missing.join(", ")}`);
      }
      if (!content.includes("mwiseman@advisacor.com")) {
        throw new Error("change log missing founder attestation");
      }
      return { status: "PASS", detail: "self-documenting first entry with all required sections" };
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
    console.error(`Phase 42.7A.5 verification failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7A.5 verification passed (${steps.length}/${steps.length} steps).`);
}

main();
