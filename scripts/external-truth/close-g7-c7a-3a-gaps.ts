import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { runChnaCoverage } from "../../assertion-packs/healthcare/chna-coverage";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");

const C7A_3A_GAPS: Record<string, string> = {
  "GAP-0085": "tests/fixtures/g7-c7a-3a/taxable-hc-disclosure-coverage/happy-cvs-10k.json",
  "GAP-0090": "tests/fixtures/g7-c7a-3a/taxable-hc-disclosure-coverage/happy-hca-10k.json",
  "GAP-0095": "tests/fixtures/g7-c7a-3a/taxable-hc-disclosure-coverage/happy-thc-10k.json",
  "GAP-0100": "tests/fixtures/g7-c7a-3a/taxable-hc-disclosure-coverage/happy-uhs-10k.json",
};

const CITATION =
  "IRC §501(r)(3) — applicability scope; assertion pack chna-coverage precondition gates §501(c)(3) hospitals only";

function main(): void {
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8")) as GapRegister;

  for (const [gapId, fixture] of Object.entries(C7A_3A_GAPS)) {
    const gap = register.gaps.find((entry) => entry.id === gapId);
    if (!gap) throw new Error(`missing ${gapId}`);
    if (gap.triage !== "fix-now") throw new Error(`${gapId} expected fix-now, got ${gap.triage}`);

    const extracted = JSON.parse(readFileSync(join(ROOT, fixture), "utf8")).extracted;
    const chna = runChnaCoverage(extracted);
    if (!chna.skipped) {
      throw new Error(`${gapId} expected chna-coverage skipped for taxable entity`);
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-3a";
    gap.closure_mechanism = "assertion-pack-scope-precondition";
    gap.scope_precondition = "tax_status === 501(c)(3) AND entity_type === hospital";
    gap.emitter_path = null;
    gap.verification_fixture = fixture;
    gap.citation_resolved = CITATION;
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by assertion-pack scope precondition: ${chna.reason}`;
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  if (counts["fix-now"] !== 82 || counts.satisfied !== 24) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", Object.keys(C7A_3A_GAPS).length, counts);
}

main();
