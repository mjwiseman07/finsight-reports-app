/**
 * Phase G7-C6 — cluster-form triage apply (§5 algorithm).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type { GapEntry, GapRegister, TriageDecision } from "./types";
import { GAP_REGISTER_PATH } from "./utils";

const ROOT = join(import.meta.dirname, "../..");
const SUMMARY_PATH = join(ROOT, "reports/g7-gap-register-summary.json");
const CLUSTERS_PATH = join(ROOT, "reports/g7-clusters.json");
const DEFERRED_PATH = join(ROOT, "docs/deferred-gaps.md");
const LIMITATIONS_DIR = join(ROOT, "docs/limitations");
const DECISIONS_PATH = join(ROOT, "docs/decisions/Phase_G7_Triage_Decisions.md");

const MANUAL_FILINGS = new Set([
  "BBY-annual",
  "HLMA-annual",
  "SIE-annual",
  "AD-annual",
  "TSCO-annual",
  "DLTE-UK-annual",
  "UNICEF-annual",
  "SAP-20f",
]);

interface SummaryRow {
  id: string;
  vertical: string;
  framework: string;
  tier: string;
  severity: string;
  classification: string;
  description: string;
  filing: string;
}

interface ClusterRow {
  pattern: string;
  tier: string;
  severity: string;
  classification: string;
  count: number;
  ids: string[];
  filings: string[];
}

interface ClusterDecision {
  triage: TriageDecision;
  target: string | null;
  reason: string;
}

interface ApplyResult {
  decisions: Record<string, ClusterDecision>;
  halts: string[];
  singletons: Array<{ pattern: string; ids: string[]; triage: string }>;
  counts: { "fix-now": number; "document-limitation": number; "defer-to-future": number };
}

function isManualCluster(cluster: ClusterRow): boolean {
  return cluster.filings.every((filing) => MANUAL_FILINGS.has(filing));
}

/** §5 cluster-form apply algorithm */
export function classifyCluster(cluster: ClusterRow): ClusterDecision | { halt: true } {
  const [vertical, framework, description] = cluster.pattern.split("/");

  if (cluster.severity === "low") {
    return {
      triage: "document-limitation",
      target: null,
      reason:
        "Narrative/optional disclosure assertions require full filing text; companyfacts metadata extract is insufficient.",
    };
  }

  if (description === "chna-cycle" && vertical === "hc" && framework === "us-gaap") {
    return {
      triage: "defer-to-future",
      target: "G10",
      reason: "§501(r) CHNA cycle requires full 10-K narrative/HTML parse beyond companyfacts API.",
    };
  }

  if (
    vertical === "mfg" &&
    framework === "us-gaap" &&
    (description === "inventory-decomposition" || description === "cogm-rollforward")
  ) {
    return {
      triage: "defer-to-future",
      target: "G10",
      reason: "Manufacturing inventory/COGM rollforward needs instance-document or full 10-K note extraction.",
    };
  }

  if (vertical === "gc" && description === "contract-type-mix") {
    return {
      triage: "document-limitation",
      target: null,
      reason:
        "Contract-type mix is disclosed in MD&A tables; not available in pruned companyfacts numeric slice.",
    };
  }

  if (isManualCluster(cluster)) {
    return {
      triage: "document-limitation",
      target: null,
      reason: "Manual IFRS/IPSAS archive stub — full annual report text not ingested in G7 corpus.",
    };
  }

  if (cluster.tier === "narrative" && cluster.severity === "medium") {
    return {
      triage: "document-limitation",
      target: null,
      reason: "Medium narrative assertions require prose sections beyond XBRL fact descriptions.",
    };
  }

  if (cluster.tier === "structural" || cluster.tier === "numeric") {
    return {
      triage: "fix-now",
      target: null,
      reason: "Extractor/router enhancement scheduled for G7-C7a (expand tags or filing-type parsers).",
    };
  }

  return { halt: true };
}

function readJsonFile<T>(path: string): T {
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as T;
}

export function applyClusterTriage(): ApplyResult {
  const summary = readJsonFile<SummaryRow[]>(SUMMARY_PATH);
  const clusters = readJsonFile<ClusterRow[]>(CLUSTERS_PATH);
  const register = readJsonFile<GapRegister>(GAP_REGISTER_PATH);
  const headSha = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();

  const decisions: Record<string, ClusterDecision> = {};
  const halts: string[] = [];
  const singletons: ApplyResult["singletons"] = [];
  const idToPattern = new Map(summary.map((row) => [row.id, `${row.vertical}/${row.framework}/${row.description}`]));

  for (const cluster of clusters) {
    const decision = classifyCluster(cluster);
    if ("halt" in decision) {
      halts.push(cluster.pattern);
      continue;
    }
    decisions[cluster.pattern] = decision;
    if (cluster.count === 1) {
      singletons.push({ pattern: cluster.pattern, ids: cluster.ids, triage: decision.triage ?? "" });
    }
    for (const id of cluster.ids) {
      const gap = register.gaps.find((entry) => entry.id === id);
      if (!gap) {
        continue;
      }
      gap.triage = decision.triage;
      gap.triageDecisionSha = headSha;
      gap.triageNote = decision.target
        ? `target: ${decision.target} | reason: ${decision.reason}`
        : `reason: ${decision.reason}`;
    }
  }

  const counts = { "fix-now": 0, "document-limitation": 0, "defer-to-future": 0 };
  for (const gap of register.gaps) {
    if (gap.triage === "fix-now") {
      counts["fix-now"] += 1;
    } else if (gap.triage === "document-limitation") {
      counts["document-limitation"] += 1;
    } else if (gap.triage === "defer-to-future") {
      counts["defer-to-future"] += 1;
    } else if (gap.triage === null) {
      const pattern = idToPattern.get(gap.id) ?? "unknown";
      halts.push(`${gap.id}:${pattern}`);
    }
  }

  writeFileSync(GAP_REGISTER_PATH, `${JSON.stringify(register, null, 2)}\n`, "utf8");
  return { decisions, halts, singletons, counts };
}

function limitationMarkdown(gap: GapEntry): string {
  return `# ${gap.id} — Accepted Limitation

- **Filing:** ${gap.filingId}
- **Vertical / framework:** ${gap.vertical} / ${gap.framework}
- **Tier / severity:** ${gap.tier} / ${gap.severity}
- **Classification:** ${gap.classification}
- **Message:** ${gap.message}

## Observed vs expected

- **Observed:** ${gap.observed}
- **Expected:** ${gap.expected}

## Accepted limitation rationale

${gap.triageNote ?? "Founder triage: document-limitation"}

Triage SHA: \`${gap.triageDecisionSha}\`
`;
}

function writeLimitationDocs(register: GapRegister): number {
  mkdirSync(LIMITATIONS_DIR, { recursive: true });
  let written = 0;
  for (const gap of register.gaps) {
    if (gap.triage !== "document-limitation") {
      continue;
    }
    writeFileSync(join(LIMITATIONS_DIR, `${gap.id}.md`), limitationMarkdown(gap), "utf8");
    written += 1;
  }
  return written;
}

function appendDeferredGaps(register: GapRegister): number {
  const deferred = register.gaps.filter((gap) => gap.triage === "defer-to-future");
  if (!existsSync(DEFERRED_PATH)) {
    writeFileSync(
      DEFERRED_PATH,
      "# Deferred Gaps\n\nGaps triaged as defer-to-future during Phase G7-C6.\n\n",
      "utf8",
    );
  }
  const block = deferred
    .map(
      (gap) =>
        `- **${gap.id}** (${gap.filingId}, ${gap.vertical}/${gap.framework}): ${gap.triageNote}`,
    )
    .join("\n");
  appendFileSync(DEFERRED_PATH, `\n## G7-C6 (${new Date().toISOString().slice(0, 10)})\n\n${block}\n`, "utf8");
  return deferred.length;
}

function writeDecisionsSummary(result: ApplyResult, register: GapRegister): void {
  const clusterLines = Object.entries(result.decisions)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pattern, decision]) => `- \`${pattern}\` → **${decision.triage}**${decision.target ? ` (${decision.target})` : ""}: ${decision.reason}`)
    .join("\n");

  const body = `# Phase G7 Triage Decisions

**Date:** ${new Date().toISOString()}
**Triage SHA:** \`${register.gaps[0]?.triageDecisionSha ?? "unknown"}\`
**Method:** cluster-form §5 apply algorithm (75 clusters → 201 gaps)

## Counts

| Triage | Gaps |
| --- | ---: |
| fix-now | ${result.counts["fix-now"]} |
| document-limitation | ${result.counts["document-limitation"]} |
| defer-to-future | ${result.counts["defer-to-future"]} |

## Reasoning patterns

1. **fix-now** — US GAAP / programmatic SEC & 990 extracts where C7a can expand XBRL tag harvest or N-CSR parsers.
2. **document-limitation** — Low-severity narrative, manual IFRS/IPSAS archives, and metadata-only GovCon MD&A assertions.
3. **defer-to-future (G10)** — Hospital §501(r) CHNA and manufacturing inventory/COGM rollforwards needing full filing text.

## Cluster decisions

${clusterLines}

## Singleton clusters (count=1)

${result.singletons.map((s) => `- \`${s.pattern}\` → ${s.triage} (${s.ids.join(", ")})`).join("\n")}

## Halts

${result.halts.length ? result.halts.map((h) => `- ${h}`).join("\n") : "_None — all 201 gaps classified._"}
`;

  mkdirSync(join(ROOT, "docs/decisions"), { recursive: true });
  writeFileSync(DECISIONS_PATH, body, "utf8");
}

function main(): void {
  const result = applyClusterTriage();
  const register = readJsonFile<GapRegister>(GAP_REGISTER_PATH);
  const limitations = writeLimitationDocs(register);
  const deferred = appendDeferredGaps(register);
  writeDecisionsSummary(result, register);
  process.stdout.write(
    `g7-c6-triage: fix-now=${result.counts["fix-now"]} document-limitation=${result.counts["document-limitation"]} defer=${result.counts["defer-to-future"]} limitations=${limitations} deferred=${deferred} halts=${result.halts.length} singletons=${result.singletons.length}\n`,
  );
  if (result.halts.length > 0) {
    process.exit(1);
  }
}

main();
