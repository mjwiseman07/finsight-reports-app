import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { emitterSatisfiesAssertion, runHealthcareRouter } from "../../lib/router/healthcare";
import type { GapRegister } from "../../scripts/external-truth/types";

const ROOT = join(import.meta.dirname, "../..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");

const COMMUNITY_BENEFIT_CLUSTER = "chna-cycle";

const FIXTURE_BY_GAP: Record<string, string> = {
  "GAP-0080": "tests/fixtures/g7-c7a-3/happy/HLMA-annual-ifrs.json",
  "GAP-0085": "tests/fixtures/g7-c7a-3/happy/CVS-10k-usgaap.json",
  "GAP-0090": "tests/fixtures/g7-c7a-3/happy/HCA-10k-usgaap.json",
  "GAP-0095": "tests/fixtures/g7-c7a-3/happy/THC-10k-usgaap.json",
  "GAP-0100": "tests/fixtures/g7-c7a-3/happy/UHS-10k-usgaap.json",
};

const EMITTER_BY_FRAMEWORK: Record<string, string> = {
  ifrs: "lib/router/healthcare/ifrs/communityBenefitPurposeDisclosure.ts",
  "us-gaap": "lib/router/healthcare/usgaap/chnaCycleDisclosure.ts",
};

function assertionFromMessage(message: string): string {
  return message.split(":")[0].split("/").pop() ?? "";
}

function main(): void {
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8")) as GapRegister;

  const clusterGaps = register.gaps.filter(
    (gap) =>
      gap.vertical === "hc" &&
      gap.triage === "fix-now" &&
      assertionFromMessage(gap.message) === COMMUNITY_BENEFIT_CLUSTER,
  );

  let closed = 0;
  for (const gap of clusterGaps) {
    const fixture = FIXTURE_BY_GAP[gap.id];
    if (!fixture) {
      throw new Error(`missing fixture mapping for ${gap.id}`);
    }

    const extracted = JSON.parse(readFileSync(join(ROOT, fixture), "utf8")).extracted;
    const router = runHealthcareRouter(extracted);
    const satisfied = emitterSatisfiesAssertion(router.results, COMMUNITY_BENEFIT_CLUSTER);
    if (!satisfied.satisfied) {
      console.log(`skip ${gap.id}: emitter dormant or fail-closed (deferred to C7a-3a for taxable HC)`);
      continue;
    }

    gap.triage = "satisfied";
    gap.closed_in = "C7a-3";
    gap.emitter_path = EMITTER_BY_FRAMEWORK[gap.framework] ?? satisfied.emitterPath ?? "";
    gap.verification_fixture = fixture;
    gap.citation_resolved = satisfied.citation ?? "";
    gap.triageDecisionSha = headSha;
    gap.triageNote = `satisfied by emitter ${gap.emitter_path} at citation ${satisfied.citation}`;
    closed += 1;
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0, satisfied: 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") counts["fix-now"] += 1;
    else if (gap.triage === "document-limitation") counts["document-limitation"] += 1;
    else if (gap.triage === "defer-to-future") counts["defer-to-future"] += 1;
    else if (gap.triage === "satisfied") counts.satisfied += 1;
  }

  const expectedFixNow = 87 - closed;
  const expectedSatisfied = 19 + closed;
  if (counts["fix-now"] !== expectedFixNow || counts.satisfied !== expectedSatisfied) {
    throw new Error(`unexpected counts: ${JSON.stringify(counts)} expected fix-now=${expectedFixNow} satisfied=${expectedSatisfied}`);
  }

  writeFileSync(REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  console.log("closed", closed, "cluster gaps", clusterGaps.length, counts);
}

main();
