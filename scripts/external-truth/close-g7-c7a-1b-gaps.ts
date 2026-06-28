import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runConstructionRouter } from "../../lib/router/construction";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");
const QUEUE_PATH = join(ROOT, "reports/c7a-1b-queue.json");

const GAP_META: Record<string, { assertionId: string; fixture: string; emitterPath: string }> = {
  "GAP-0011": {
    assertionId: "asc606-over-time",
    fixture: "tests/fixtures/g7-c7a-1b/happy/flr-10k-units.json",
    emitterPath: "lib/router/construction/usgaap/unitsOfDeliveryOutputMeasure.ts",
  },
  "GAP-0017": {
    assertionId: "asc606-over-time",
    fixture: "tests/fixtures/g7-c7a-1b/happy/gva-10k-milestones.json",
    emitterPath: "lib/router/construction/usgaap/milestoneOutputMeasure.ts",
  },
  "GAP-0020": {
    assertionId: "contract-balances-rollforward",
    fixture: "tests/fixtures/g7-c7a-1b/happy/mtz-10k-balances.json",
    emitterPath: "lib/router/construction/usgaap/contractBalanceRollforward.ts",
  },
  "GAP-0023": {
    assertionId: "asc606-over-time",
    fixture: "tests/fixtures/g7-c7a-1b/happy/mtz-10k-milestones.json",
    emitterPath: "lib/router/construction/usgaap/milestoneOutputMeasure.ts",
  },
  "GAP-0024": {
    assertionId: "poc-method-declared",
    fixture: "tests/fixtures/g7-c7a-1b/happy/pwr-10k-milestones.json",
    emitterPath: "lib/router/construction/usgaap/milestoneOutputMeasure.ts",
  },
  "GAP-0025": {
    assertionId: "cost-to-cost-ratio",
    fixture: "tests/fixtures/g7-c7a-1b/happy/pwr-10k-post-completion.json",
    emitterPath: "lib/router/construction/usgaap/postCompletionAdjustments.ts",
  },
  "GAP-0026": {
    assertionId: "contract-balances-rollforward",
    fixture: "tests/fixtures/g7-c7a-1b/happy/pwr-10k-post-completion.json",
    emitterPath: "lib/router/construction/usgaap/postCompletionAdjustments.ts",
  },
  "GAP-0029": {
    assertionId: "asc606-over-time",
    fixture: "tests/fixtures/g7-c7a-1b/happy/pwr-10k-milestones.json",
    emitterPath: "lib/router/construction/usgaap/milestoneOutputMeasure.ts",
  },
};

function main(): void {
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const queue = JSON.parse(readFileSync(QUEUE_PATH, "utf8")) as Array<{ id: string }>;
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8")) as GapRegister;

  for (const entry of queue) {
    const meta = GAP_META[entry.id];
    if (!meta) throw new Error(`missing close metadata for ${entry.id}`);

    const gap = register.gaps.find((g) => g.id === entry.id);
    if (!gap) throw new Error(`missing ${entry.id}`);
    if (gap.triage !== "fix-now") throw new Error(`${entry.id} expected fix-now, got ${gap.triage}`);

    const extracted = JSON.parse(readFileSync(join(ROOT, meta.fixture), "utf8")).extracted;
    const router = runConstructionRouter(extracted);
    const satisfied = emitterSatisfiesAssertion(router.results, meta.assertionId);
    if (!satisfied.satisfied) {
      throw new Error(`${entry.id} emitter did not satisfy ${meta.assertionId}`);
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-1b";
    gap.closure_mechanism = "emitter-satisfaction";
    gap.emitter_path = meta.emitterPath;
    gap.verification_fixture = meta.fixture;
    gap.citation_resolved = satisfied.citation ?? "";
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by emitter ${meta.emitterPath} at citation ${satisfied.citation}`;
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  if (counts["fix-now"] !== 34 || counts.satisfied !== 74) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", queue.length, counts);
}

main();
