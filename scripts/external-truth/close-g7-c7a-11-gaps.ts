import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runHealthcareRouter } from "../../lib/router/healthcare";
import { FRAMEWORK_SUBSTITUTE_NOTE_IPC_VS_IFRS } from "../../lib/router/lanes/healthcare/types";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");
const QUEUE_PATH = join(ROOT, "reports/c7a-11-queue.json");

const GAP_META: Record<
  string,
  {
    assertionId: string;
    fixture: string;
    emitterPath: string;
    framework_substitute_note?: string;
  }
> = {
  "GAP-0082": {
    assertionId: "bad-debt-vs-charity",
    fixture: "tests/fixtures/healthcare/payor-mix/ifrs/happy-hlma-annual-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/ifrs/receivablesECL.ts",
    framework_substitute_note: FRAMEWORK_SUBSTITUTE_NOTE_IPC_VS_IFRS,
  },
  "GAP-0083": {
    assertionId: "payor-mix",
    fixture: "tests/fixtures/healthcare/payor-mix/ifrs/happy-hlma-annual-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/ifrs/payorMixIFRS.ts",
  },
  "GAP-0087": {
    assertionId: "bad-debt-vs-charity",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-cvs-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/allowanceRollforward.ts",
  },
  "GAP-0088": {
    assertionId: "payor-mix",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-cvs-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts",
  },
  "GAP-0092": {
    assertionId: "bad-debt-vs-charity",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-hca-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/implicitPriceConcession.ts",
  },
  "GAP-0093": {
    assertionId: "payor-mix",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-hca-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts",
  },
  "GAP-0097": {
    assertionId: "bad-debt-vs-charity",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-thc-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/allowanceRollforward.ts",
  },
  "GAP-0098": {
    assertionId: "payor-mix",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-thc-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts",
  },
  "GAP-0102": {
    assertionId: "bad-debt-vs-charity",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-uhs-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/implicitPriceConcession.ts",
  },
  "GAP-0103": {
    assertionId: "payor-mix",
    fixture: "tests/fixtures/healthcare/payor-mix/happy-uhs-10k-full.json",
    emitterPath: "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts",
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
    const router = runHealthcareRouter(extracted);
    if (router.frameworkViolation) {
      throw new Error(`${entry.id} unexpected framework violation on happy fixture`);
    }
    const satisfied = emitterSatisfiesAssertion(router.results, meta.assertionId);
    if (!satisfied.satisfied) {
      throw new Error(`${entry.id} emitter did not satisfy ${meta.assertionId}`);
    }
    if (satisfied.emitterPath !== meta.emitterPath) {
      throw new Error(
        `${entry.id} emitter path mismatch: expected ${meta.emitterPath}, got ${satisfied.emitterPath}`,
      );
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-11";
    gap.closure_mechanism = "emitter-satisfaction";
    gap.emitter_path = meta.emitterPath;
    gap.verification_fixture = meta.fixture;
    gap.citation_resolved = satisfied.citation ?? "";
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by emitter ${meta.emitterPath} at citation ${satisfied.citation}`;
    if (meta.framework_substitute_note) {
      gap.framework_substitute_note = meta.framework_substitute_note;
    }
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  if (counts["fix-now"] !== 9 || counts["document-limitation"] !== 91 || counts.satisfied !== 101) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", queue.length, counts);
}

main();
