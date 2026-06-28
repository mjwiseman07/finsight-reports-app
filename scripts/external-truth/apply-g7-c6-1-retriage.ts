/**
 * Phase G7-C6.1 — surgical re-triage (§4 apply algorithm).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GapEntry, GapRegister, TriageDecision } from "./types";
import { GAP_REGISTER_PATH } from "./utils";

const ROOT = join(import.meta.dirname, "../..");
const CLUSTERS_PATH = join(ROOT, "reports/g7-gap-register-clusters.json");
const DEFERRED_PATH = join(ROOT, "docs/deferred-gaps.md");
const LIMITATIONS_DIR = join(ROOT, "docs/limitations");
const DECISIONS_PATH = join(ROOT, "docs/decisions/Phase_G7_C6_1_Reclassifications.md");

interface ClusterRow {
  pattern: string;
  ids: string[];
}

interface ReclassRule {
  group: string;
  ids: string[];
  from: TriageDecision;
  to: TriageDecision;
  reason: string;
}

interface ApplyResult {
  rules: ReclassRule[];
  deletedLimitations: string[];
  counts: { "fix-now": number; "document-limitation": number; "defer-to-future": number };
}

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as T;
}

function idsForPattern(clusters: ClusterRow[], pattern: string): string[] {
  const row = clusters.find((cluster) => cluster.pattern === pattern);
  if (!row) {
    throw new Error(`cluster pattern not found: ${pattern}`);
  }
  return row.ids;
}

/** §4 — explicit surgical reclassification rules */
export function buildReclassRules(clusters: ClusterRow[]): ReclassRule[] {
  const groupA = idsForPattern(clusters, "hc/us-gaap/chna-cycle");
  const groupB = [
    ...idsForPattern(clusters, "mfg/us-gaap/inventory-decomposition"),
    ...idsForPattern(clusters, "mfg/us-gaap/cogm-rollforward"),
  ];
  const groupBBonus = idsForPattern(clusters, "mfg/ifrs/inventory-decomposition");
  const groupC = [
    ...idsForPattern(clusters, "con/ifrs/poc-method-declared"),
    ...idsForPattern(clusters, "con/ifrs/cost-to-cost-ratio"),
    ...idsForPattern(clusters, "con/ifrs/contract-balances-rollforward"),
    ...idsForPattern(clusters, "hc/ifrs/bad-debt-vs-charity"),
    ...idsForPattern(clusters, "hc/ifrs/payor-mix"),
    ...idsForPattern(clusters, "ps/ifrs/unbilled-receivables"),
    ...idsForPattern(clusters, "saas/ifrs/deferred-revenue-rollforward"),
    ...idsForPattern(clusters, "ps/ifrs/principal-agent-pass-through"),
  ];

  const chnaReason =
    "HC CHNA scope correction: hospital §501(r) CHNA cycle is fix-now for G7-C7a SEC XBRL tag harvest (G10 defer retracted for programmatic 10-K filers).";
  const mfgReason =
    "MFG inventory scope correction: inventory decomposition and COGM rollforward achievable via expanded XBRL tags in G7-C7a (G10 defer retracted).";
  const ifrsReason =
    "IFRS parity: structural manual-archive gap mirrors US GAAP fix-now cluster; C7a will implement IFRS extractor parity.";
  const bonusReason =
    "MFG IFRS inventory-decomposition parity with US GAAP inventory cluster now fix-now.";

  return [
    {
      group: "A — HC CHNA scope",
      ids: groupA,
      from: "defer-to-future",
      to: "fix-now",
      reason: chnaReason,
    },
    {
      group: "B — MFG inventory US GAAP",
      ids: groupB,
      from: "defer-to-future",
      to: "fix-now",
      reason: mfgReason,
    },
    {
      group: "B-bonus — MFG IFRS inventory",
      ids: groupBBonus,
      from: "document-limitation",
      to: "fix-now",
      reason: bonusReason,
    },
    {
      group: "C — IFRS structural parity",
      ids: groupC,
      from: "document-limitation",
      to: "fix-now",
      reason: ifrsReason,
    },
  ];
}

const LIMITATION_DELETE_IDS = [
  "GAP-0001",
  "GAP-0002",
  "GAP-0003",
  "GAP-0082",
  "GAP-0083",
  "GAP-0147",
  "GAP-0181",
  "GAP-0105",
];

export function applySurgicalRetriage(): ApplyResult {
  const clusters = readJsonFile<ClusterRow[]>(CLUSTERS_PATH);
  const register = readJsonFile<GapRegister>(GAP_REGISTER_PATH);
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const rules = buildReclassRules(clusters);
  const allIds = rules.flatMap((rule) => rule.ids);

  if (allIds.length !== 21) {
    throw new Error(`expected 21 reclassifications, got ${allIds.length}`);
  }

  const deletedLimitations: string[] = [];
  for (const rule of rules) {
    for (const id of rule.ids) {
      const gap = register.gaps.find((entry) => entry.id === id);
      if (!gap) {
        throw new Error(`gap not found: ${id}`);
      }
      if (gap.triage !== rule.from) {
        throw new Error(`${id}: expected triage ${rule.from}, got ${gap.triage}`);
      }
      gap.triage = rule.to;
      gap.triageDecisionSha = headSha;
      gap.triageNote = `G7-C6.1 ${rule.group}: ${rule.reason}`;
    }
  }

  for (const id of LIMITATION_DELETE_IDS) {
    const path = join(LIMITATIONS_DIR, `${id}.md`);
    if (!existsSync(path)) {
      throw new Error(`limitation file missing: ${path}`);
    }
    unlinkSync(path);
    deletedLimitations.push(`${id}.md`);
  }

  writeFileSync(
    DEFERRED_PATH,
    "# Deferred Gaps\n\nGaps triaged as defer-to-future during Phase G7-C6.\n\n_No deferred gaps after G7-C6.1 surgical re-triage._\n",
    "utf8",
  );

  writeFileSync(GAP_REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") {
      counts["fix-now"] += 1;
    } else if (gap.triage === "document-limitation") {
      counts["document-limitation"] += 1;
    } else if (gap.triage === "defer-to-future") {
      counts["defer-to-future"] += 1;
    }
  }

  if (counts["fix-now"] !== 102 || counts["document-limitation"] !== 99 || counts["defer-to-future"] !== 0) {
    throw new Error(
      `unexpected counts: fix-now=${counts["fix-now"]} document-limitation=${counts["document-limitation"]} defer=${counts["defer-to-future"]}`,
    );
  }

  writeDecisionsDoc(rules, register, headSha, counts, deletedLimitations);
  return { rules, deletedLimitations, counts };
}

function writeDecisionsDoc(
  rules: ReclassRule[],
  register: GapRegister,
  headSha: string,
  counts: ApplyResult["counts"],
  deletedLimitations: string[],
): void {
  const lines = rules.flatMap((rule) =>
    rule.ids.map((id) => {
      const gap = register.gaps.find((entry) => entry.id === id) as GapEntry;
      return `| ${id} | ${gap.filingId} | ${rule.from} | ${rule.to} | ${rule.group} |`;
    }),
  );

  const body = `# Phase G7-C6.1 Reclassifications

**Date:** ${new Date().toISOString()}
**Base triage SHA:** \`59398f7\` (G7-C6)
**Re-triage SHA:** \`${headSha}\`
**Method:** surgical §4 apply algorithm (21 targeted reclassifications)

## Final counts

| Triage | Gaps |
| --- | ---: |
| fix-now | ${counts["fix-now"]} |
| document-limitation | ${counts["document-limitation"]} |
| defer-to-future | ${counts["defer-to-future"]} |

## Groups

1. **Group A — HC CHNA scope** (4 gaps): \`defer-to-future\` → \`fix-now\` for \`hc/us-gaap/chna-cycle\`.
2. **Group B — MFG inventory US GAAP** (8 gaps): \`defer-to-future\` → \`fix-now\` for \`mfg/us-gaap/inventory-decomposition\` + \`cogm-rollforward\`.
3. **Group B-bonus — MFG IFRS inventory** (1 gap): \`document-limitation\` → \`fix-now\` for \`mfg/ifrs/inventory-decomposition\`.
4. **Group C — IFRS structural parity** (8 gaps): \`document-limitation\` → \`fix-now\` for structural IFRS singletons mirroring US GAAP fix-now clusters.

## Reclassification table

| Gap | Filing | From | To | Group |
| --- | --- | --- | --- | --- |
${lines.join("\n")}

## Deleted limitation files (${deletedLimitations.length})

${deletedLimitations.map((file) => `- \`docs/limitations/${file}\``).join("\n")}

## Deferred gaps registry

All 12 G7-C6 defer-to-future entries removed; \`docs/deferred-gaps.md\` reset to empty placeholder.
`;

  mkdirSync(join(ROOT, "docs/decisions"), { recursive: true });
  writeFileSync(DECISIONS_PATH, body, "utf8");
}

function main(): void {
  const result = applySurgicalRetriage();
  process.stdout.write(
    `g7-c6.1-retriage: reclassified=21 fix-now=${result.counts["fix-now"]} document-limitation=${result.counts["document-limitation"]} defer=${result.counts["defer-to-future"]} deleted=${result.deletedLimitations.length}\n`,
  );
}

main();
