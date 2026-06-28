import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runConstructionRouter } from "../../lib/router/construction";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");

const C7A_1_GAPS: Record<
  string,
  { assertionId: string; emitterKey: string; fixture: string }
> = {
  "GAP-0001": {
    assertionId: "poc-method-declared",
    emitterKey: "poc",
    fixture: "tests/fixtures/g7-c7a-1/happy/BBY-annual-ifrs.json",
  },
  "GAP-0002": {
    assertionId: "cost-to-cost-ratio",
    emitterKey: "cost",
    fixture: "tests/fixtures/g7-c7a-1/happy/BBY-annual-ifrs.json",
  },
  "GAP-0003": {
    assertionId: "contract-balances-rollforward",
    emitterKey: "balances",
    fixture: "tests/fixtures/g7-c7a-1/happy/BBY-annual-ifrs.json",
  },
  "GAP-0006": {
    assertionId: "poc-method-declared",
    emitterKey: "poc",
    fixture: "tests/fixtures/g7-c7a-1/happy/FLR-10k-usgaap.json",
  },
  "GAP-0007": {
    assertionId: "cost-to-cost-ratio",
    emitterKey: "cost",
    fixture: "tests/fixtures/g7-c7a-1/happy/FLR-10k-usgaap.json",
  },
  "GAP-0008": {
    assertionId: "contract-balances-rollforward",
    emitterKey: "balances",
    fixture: "tests/fixtures/g7-c7a-1/happy/FLR-10k-usgaap.json",
  },
  "GAP-0012": {
    assertionId: "poc-method-declared",
    emitterKey: "poc",
    fixture: "tests/fixtures/g7-c7a-1/happy/GVA-10k-usgaap.json",
  },
  "GAP-0013": {
    assertionId: "cost-to-cost-ratio",
    emitterKey: "cost",
    fixture: "tests/fixtures/g7-c7a-1/happy/GVA-10k-usgaap.json",
  },
  "GAP-0014": {
    assertionId: "contract-balances-rollforward",
    emitterKey: "balances",
    fixture: "tests/fixtures/g7-c7a-1/happy/GVA-10k-usgaap.json",
  },
  "GAP-0018": {
    assertionId: "poc-method-declared",
    emitterKey: "poc",
    fixture: "tests/fixtures/g7-c7a-1/happy/MTZ-10k-usgaap.json",
  },
  "GAP-0019": {
    assertionId: "cost-to-cost-ratio",
    emitterKey: "cost",
    fixture: "tests/fixtures/g7-c7a-1/happy/MTZ-10k-usgaap.json",
  },
};

const EMITTER_PATHS: Record<string, { usgaap: string; ifrs: string }> = {
  poc: {
    usgaap: "lib/router/construction/usgaap/pocMethodDisclosure.ts",
    ifrs: "lib/router/construction/ifrs/pocMethodDisclosure.ts",
  },
  cost: {
    usgaap: "lib/router/construction/usgaap/costToCostInputMeasure.ts",
    ifrs: "lib/router/construction/ifrs/inputMeasureJustification.ts",
  },
  balances: {
    usgaap: "lib/router/construction/usgaap/contractBalanceRollforward.ts",
    ifrs: "lib/router/construction/ifrs/contractBalanceRollforward.ts",
  },
};

function laneForGap(gap: GapRegister["gaps"][number]): string {
  return gap.framework === "ifrs" ? "ifrs" : "usgaap";
}

function main(): void {
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8")) as GapRegister;

  for (const [gapId, meta] of Object.entries(C7A_1_GAPS)) {
    const gap = register.gaps.find((entry) => entry.id === gapId);
    if (!gap) {
      throw new Error(`missing ${gapId}`);
    }
    if (gap.triage !== "fix-now") {
      throw new Error(`${gapId} expected fix-now, got ${gap.triage}`);
    }
    const lane = laneForGap(gap);
    const emitterPath = EMITTER_PATHS[meta.emitterKey][lane as "usgaap" | "ifrs"];
    const router = runConstructionRouter(
      JSON.parse(readFileSync(join(ROOT, meta.fixture), "utf8")).extracted,
    );
    const satisfied = emitterSatisfiesAssertion(router.results, meta.assertionId);
    if (!satisfied.satisfied) {
      throw new Error(`${gapId} emitter did not satisfy ${meta.assertionId}`);
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-1";
    gap.emitter_path = emitterPath;
    gap.verification_fixture = meta.fixture;
    gap.citation_resolved = satisfied.citation ?? "";
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by emitter ${emitterPath} at citation ${satisfied.citation}`;
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  if (counts["fix-now"] !== 95 || counts.satisfied !== 11) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", Object.keys(C7A_1_GAPS).length, counts);
}

main();
