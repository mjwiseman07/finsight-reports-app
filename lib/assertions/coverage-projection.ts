import { ACCOUNT_CATEGORIES, ASSERTION_IDS } from "@/lib/pre-close/assertions-types";
import type {
  CoverageStatus,
  EvidenceStrength,
  ProjectedCoverageRow,
  ProjectionInput,
  RootCauseCode,
} from "@/lib/pre-close/assertions-coverage-types";

export function projectCoverage(input: ProjectionInput): ProjectedCoverageRow[] {
  const relevanceMap = new Map<string, "relevant" | "usually_not_primary" | "not_applicable">();
  for (const r of input.relevance) {
    relevanceMap.set(`${r.account_category}::${r.assertion_id}`, r.relevance);
  }

  const firesByRule = new Map<
    string,
    { fired: string[]; suppressed: string[]; errored: string[]; other: string[] }
  >();
  for (const f of input.fires) {
    let bucket = firesByRule.get(f.rule_id);
    if (!bucket) {
      bucket = { fired: [], suppressed: [], errored: [], other: [] };
      firesByRule.set(f.rule_id, bucket);
    }
    if (f.outcome === "fired") bucket.fired.push(f.fire_id);
    else if (f.outcome === "suppressed") bucket.suppressed.push(f.fire_id);
    else if (f.outcome === "error") bucket.errored.push(f.fire_id);
    else bucket.other.push(f.fire_id);
  }

  const rows: ProjectedCoverageRow[] = [];
  for (const account_category of ACCOUNT_CATEGORIES) {
    for (const assertion_id of ASSERTION_IDS) {
      const relevance =
        relevanceMap.get(`${account_category}::${assertion_id}`) ?? "not_applicable";

      if (relevance === "not_applicable" || relevance === "usually_not_primary") {
        rows.push({
          account_category,
          assertion_id,
          relevance_at_computation: relevance,
          coverage_status: "not_applicable",
          covering_rule_ids: [],
          covering_fire_ids: [],
          evidence_strength: "unassessed",
          gap_root_cause_code: null,
        });
        continue;
      }

      const coveringRules = input.ruleCoverage.filter(
        (rc) =>
          rc.assertion_id === assertion_id &&
          rc.account_categories.includes(account_category),
      );

      if (coveringRules.length === 0) {
        rows.push({
          account_category,
          assertion_id,
          relevance_at_computation: relevance,
          coverage_status: "gap",
          covering_rule_ids: [],
          covering_fire_ids: [],
          evidence_strength: "unassessed",
          gap_root_cause_code: "no_rule_defined",
        });
        continue;
      }

      let anyPrimaryFired = false;
      let anySecondaryFired = false;
      let anyPartialFired = false;
      let anyFired = false;
      let anySuppressed = false;
      let anyErrored = false;
      const firedRuleIds: string[] = [];
      const firedFireIds: string[] = [];

      for (const rc of coveringRules) {
        const bucket = firesByRule.get(rc.rule_id);
        if (!bucket) continue;
        if (bucket.fired.length > 0) {
          anyFired = true;
          firedRuleIds.push(rc.rule_id);
          firedFireIds.push(...bucket.fired);
          if (rc.coverage_strength === "primary") anyPrimaryFired = true;
          else if (rc.coverage_strength === "secondary") anySecondaryFired = true;
          else if (rc.coverage_strength === "partial") anyPartialFired = true;
        } else if (bucket.suppressed.length > 0) {
          anySuppressed = true;
        } else if (bucket.errored.length > 0) {
          anyErrored = true;
        }
      }

      let status: CoverageStatus;
      let strength: EvidenceStrength;
      let root: RootCauseCode | null = null;

      if (anyPrimaryFired) {
        status = "tested";
        strength = "strong";
      } else if (anySecondaryFired) {
        status = "partial";
        strength = "moderate";
        root = "coverage_partial_by_design";
      } else if (anyPartialFired) {
        status = "partial";
        strength = "weak";
        root = "coverage_partial_by_design";
      } else if (!anyFired && anyErrored) {
        status = "gap";
        strength = "unassessed";
        root = "rule_errored";
      } else if (!anyFired && anySuppressed) {
        status = "gap";
        strength = "unassessed";
        root = "rule_fired_but_all_suppressed";
      } else {
        status = "gap";
        strength = "unassessed";
        root = "rule_defined_but_not_fired";
      }

      rows.push({
        account_category,
        assertion_id,
        relevance_at_computation: relevance,
        coverage_status: status,
        covering_rule_ids: Array.from(new Set(firedRuleIds)),
        covering_fire_ids: Array.from(new Set(firedFireIds)),
        evidence_strength: strength,
        gap_root_cause_code: root,
      });
    }
  }
  return rows;
}

export interface CoverageSummary {
  totalPairs: number;
  tested: number;
  partial: number;
  gap: number;
  notApplicable: number;
  gapRate: number;
}

export function summarize(rows: ProjectedCoverageRow[]): CoverageSummary {
  const s: CoverageSummary = {
    totalPairs: rows.length,
    tested: 0,
    partial: 0,
    gap: 0,
    notApplicable: 0,
    gapRate: 0,
  };
  for (const r of rows) {
    if (r.coverage_status === "tested") s.tested++;
    else if (r.coverage_status === "partial") s.partial++;
    else if (r.coverage_status === "gap") s.gap++;
    else s.notApplicable++;
  }
  const relevant = s.tested + s.partial + s.gap;
  s.gapRate = relevant > 0 ? s.gap / relevant : 0;
  return s;
}
