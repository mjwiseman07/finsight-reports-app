import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runManufacturingRouter } from "../../lib/router/manufacturing";
import {
  FRAMEWORK_SUBSTITUTE_NOTE_COGM_IFRS,
  FRAMEWORK_SUBSTITUTE_NOTE_NRV_REVERSAL,
} from "../../lib/router/lanes/manufacturing/types";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");
const QUEUE_PATH = join(ROOT, "reports/c7a-15-queue.json");

const GAP_META: Record<
  string,
  {
    assertionId: string;
    fixture: string;
    emitterPath: string;
    framework_substitute_note?: string;
  }
> = {
  "GAP-0105": {
    assertionId: "inventory-decomposition",
    fixture: "tests/fixtures/manufacturing/inventory/ifrs/happy-sie-annual-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2.ts",
    framework_substitute_note: `${FRAMEWORK_SUBSTITUTE_NOTE_COGM_IFRS} ${FRAMEWORK_SUBSTITUTE_NOTE_NRV_REVERSAL}`,
  },
  "GAP-0110": {
    assertionId: "inventory-decomposition",
    fixture: "tests/fixtures/manufacturing/inventory/happy-cat-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
  },
  "GAP-0111": {
    assertionId: "cogm-rollforward",
    fixture: "tests/fixtures/manufacturing/inventory/happy-cat-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/cogmRollforward.ts",
  },
  "GAP-0115": {
    assertionId: "inventory-decomposition",
    fixture: "tests/fixtures/manufacturing/inventory/happy-etn-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
  },
  "GAP-0116": {
    assertionId: "cogm-rollforward",
    fixture: "tests/fixtures/manufacturing/inventory/happy-etn-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/cogmRollforward.ts",
  },
  "GAP-0120": {
    assertionId: "inventory-decomposition",
    fixture: "tests/fixtures/manufacturing/inventory/happy-ge-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
  },
  "GAP-0121": {
    assertionId: "cogm-rollforward",
    fixture: "tests/fixtures/manufacturing/inventory/happy-ge-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/cogmRollforward.ts",
  },
  "GAP-0125": {
    assertionId: "inventory-decomposition",
    fixture: "tests/fixtures/manufacturing/inventory/happy-hon-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
  },
  "GAP-0126": {
    assertionId: "cogm-rollforward",
    fixture: "tests/fixtures/manufacturing/inventory/happy-hon-10k-full.json",
    emitterPath: "lib/router/lanes/manufacturing/emitters/cogmRollforward.ts",
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
    const router = runManufacturingRouter(extracted);
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
    gap.closed_in = "C7a-15";
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

  if (counts["fix-now"] !== 0 || counts["document-limitation"] !== 91 || counts.satisfied !== 110) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", queue.length, counts);
}

main();
