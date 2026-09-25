const fs = require("fs");
const path = require("path");
const lib = require("./scripts/orchestrator/lib.js");

const md = `# t

## Plan ID
Plan ID: TEST-PLAN-001

## Title
Title: t

## Status
STATUS: DRAFT

## Objective
Verify orchestrator fail-closed behavior with a harmless fixture plan.

## Scope
- a

## Out of Scope
- b

## Security Requirements

## Tenant Isolation Requirements
- N/A

## Acceptance Criteria
- Criterion one is met

## Required Tests
- t

## Validation Commands
- v

## Prohibited Changes
- p

## Rollback Considerations
- r

## Human Approval Gate

`;

const p = path.join("tests/orchestrator/_tmp", "debug-plan.md");
fs.mkdirSync(path.dirname(p), { recursive: true });
fs.writeFileSync(p, md);
const r = lib.validatePlanStructure(p);
console.log("errors:", r.errors);
console.log(
  "sec:",
  JSON.stringify(lib.extractSectionBody(md, "Security Requirements")),
);
console.log(
  "human:",
  JSON.stringify(lib.extractSectionBody(md, "Human Approval Gate")),
);
