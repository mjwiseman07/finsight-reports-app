import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runRetailRouter } from "../../lib/router/retail";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");
const QUEUE_IDS = ["GAP-0164", "GAP-0168"] as const;

const GAP_META: Record<
  string,
  { assertionId: string; fixture: string; emitterPath: string; framework_violation_handling: string }
> = {
  "GAP-0164": {
    assertionId: "inventory-method-declared",
    fixture: "tests/fixtures/g7-c7a-7/happy/ad-annual.json",
    emitterPath: "lib/router/retail/ifrs/inventoryMethodDeclaration.ts",
    framework_violation_handling:
      "LIFO declaration triggers FrameworkViolationError per IAS 2.25; no silent emission",
  },
  "GAP-0168": {
    assertionId: "inventory-method-declared",
    fixture: "tests/fixtures/g7-c7a-7/happy/tsco-annual.json",
    emitterPath: "lib/router/retail/ifrs/inventoryMethodDeclaration.ts",
    framework_violation_handling:
      "LIFO declaration triggers FrameworkViolationError per IAS 2.25; no silent emission",
  },
};

const LIMITATION_PATHS = [
  join(ROOT, "docs/limitations/GAP-0164.md"),
  join(ROOT, "docs/limitations/GAP-0168.md"),
];

function main(): void {
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8")) as GapRegister;

  for (const gapId of QUEUE_IDS) {
    const meta = GAP_META[gapId];
    const gap = register.gaps.find((g) => g.id === gapId);
    if (!gap) throw new Error(`missing ${gapId}`);

    if (gap.triage === "document-limitation") {
      gap.triage = "fix-now";
      gap.reclassified_in = "C7a-7";
      gap.triageNote = "reclassified doc-lim -> fix-now for C7a-7 RTL IFRS inventory emitter";
    }
    if (gap.triage !== "fix-now") throw new Error(`${gapId} expected fix-now, got ${gap.triage}`);

    const extracted = JSON.parse(readFileSync(join(ROOT, meta.fixture), "utf8")).extracted;
    const router = runRetailRouter(extracted);
    if (router.frameworkViolation) {
      throw new Error(`${gapId} unexpected framework violation on happy fixture`);
    }
    const satisfied = emitterSatisfiesAssertion(router.results, meta.assertionId);
    if (!satisfied.satisfied) {
      throw new Error(`${gapId} emitter did not satisfy ${meta.assertionId}`);
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-7";
    gap.closure_mechanism = "emitter-satisfaction";
    gap.emitter_path = meta.emitterPath;
    gap.verification_fixture = meta.fixture;
    gap.citation_resolved = satisfied.citation ?? "";
    gap.framework_violation_handling = meta.framework_violation_handling;
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by emitter ${meta.emitterPath} at citation ${satisfied.citation}`;
  }

  for (const path of LIMITATION_PATHS) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  if (counts["fix-now"] !== 50 || counts["document-limitation"] !== 93 || counts.satisfied !== 58) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  writeFileSync(
    join(ROOT, "reports/c7a-7-queue.json"),
    `${JSON.stringify(
      QUEUE_IDS.map((id) => ({ id, ...GAP_META[id] })),
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log("closed", QUEUE_IDS.length, counts);
}

main();
