import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runNonprofitRouter } from "../../lib/router/nonprofit";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");
const QUEUE_PATH = join(ROOT, "reports/c7a-4-queue.json");

const GAP_META: Record<string, { assertionId: string; fixture: string; emitterPath: string }> = {
  "GAP-0135": {
    assertionId: "functional-expense-allocation",
    fixture: "tests/fixtures/g7-c7a-4/usgaap/functionalExpenseAllocation/happy-501c3-charity.json",
    emitterPath: "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts",
  },
  "GAP-0138": {
    assertionId: "functional-expense-allocation",
    fixture: "tests/fixtures/g7-c7a-4/usgaap/functionalExpenseAllocation/happy-goodwill-990.json",
    emitterPath: "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts",
  },
  "GAP-0141": {
    assertionId: "functional-expense-allocation",
    fixture: "tests/fixtures/g7-c7a-4/usgaap/functionalExpenseAllocation/happy-habitat-990.json",
    emitterPath: "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts",
  },
  "GAP-0143": {
    assertionId: "part9-part10-cross-tie",
    fixture: "tests/fixtures/g7-c7a-4/usgaap/functionalExpenseAllocation/happy-salvation-army-990.json",
    emitterPath: "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts",
  },
  "GAP-0145": {
    assertionId: "functional-expense-allocation",
    fixture: "tests/fixtures/g7-c7a-4/usgaap/functionalExpenseAllocation/happy-salvation-army-990.json",
    emitterPath: "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts",
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
    const router = runNonprofitRouter(extracted);
    const satisfied = emitterSatisfiesAssertion(router.results, meta.assertionId);
    if (!satisfied.satisfied) {
      throw new Error(`${entry.id} emitter did not satisfy ${meta.assertionId}`);
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-4";
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

  if (counts["fix-now"] !== 77 || counts.satisfied !== 29) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", queue.length, counts);
}

main();
