import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runFundAccountingRouter } from "../../lib/router/fund-accounting";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");

const C7A_2_GAPS: Record<string, { assertionId: string; fixture: string }> = {
  "GAP-0030": {
    assertionId: "nav-computation",
    fixture: "tests/fixtures/g7-c7a-2/happy/FXAIX-NCSR-usgaap.json",
  },
  "GAP-0031": {
    assertionId: "expense-ratio",
    fixture: "tests/fixtures/g7-c7a-2/happy/FXAIX-NCSR-usgaap.json",
  },
  "GAP-0033": {
    assertionId: "portfolio-composition",
    fixture: "tests/fixtures/g7-c7a-2/happy/FXAIX-NCSR-usgaap.json",
  },
  "GAP-0035": {
    assertionId: "realized-unrealized-gains",
    fixture: "tests/fixtures/g7-c7a-2/happy/FXAIX-NCSR-usgaap.json",
  },
  "GAP-0037": {
    assertionId: "nav-computation",
    fixture: "tests/fixtures/g7-c7a-2/happy/IVV-NCSR-usgaap.json",
  },
  "GAP-0038": {
    assertionId: "expense-ratio",
    fixture: "tests/fixtures/g7-c7a-2/happy/IVV-NCSR-usgaap.json",
  },
  "GAP-0040": {
    assertionId: "portfolio-composition",
    fixture: "tests/fixtures/g7-c7a-2/happy/IVV-NCSR-usgaap.json",
  },
  "GAP-0042": {
    assertionId: "realized-unrealized-gains",
    fixture: "tests/fixtures/g7-c7a-2/happy/IVV-NCSR-usgaap.json",
  },
};

const EMITTER_PATHS: Record<string, string> = {
  "nav-computation": "lib/router/fund-accounting/usgaap/navPerShareRollforward.ts",
  "expense-ratio": "lib/router/fund-accounting/usgaap/expenseRatioDisclosure.ts",
  "portfolio-composition": "lib/router/fund-accounting/usgaap/investmentScheduleSummary.ts",
  "realized-unrealized-gains": "lib/router/fund-accounting/usgaap/realizedUnrealizedGains.ts",
};

function main(): void {
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8")) as GapRegister;

  for (const [gapId, meta] of Object.entries(C7A_2_GAPS)) {
    const gap = register.gaps.find((entry) => entry.id === gapId);
    if (!gap) throw new Error(`missing ${gapId}`);
    if (gap.triage !== "fix-now") throw new Error(`${gapId} expected fix-now, got ${gap.triage}`);

    const extracted = JSON.parse(readFileSync(join(ROOT, meta.fixture), "utf8")).extracted;
    const router = runFundAccountingRouter(extracted);
    const satisfied = emitterSatisfiesAssertion(router.results, meta.assertionId);
    if (!satisfied.satisfied) throw new Error(`${gapId} emitter did not satisfy ${meta.assertionId}`);

    gap.triage = "satisfied";
    gap.closed_in = "C7a-2";
    gap.emitter_path = EMITTER_PATHS[meta.assertionId];
    gap.verification_fixture = meta.fixture;
    gap.citation_resolved = satisfied.citation ?? "";
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by emitter ${gap.emitter_path} at citation ${satisfied.citation}`;
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  if (counts["fix-now"] !== 87 || counts.satisfied !== 19) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", Object.keys(C7A_2_GAPS).length, counts);
}

main();
