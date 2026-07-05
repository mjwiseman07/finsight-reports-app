import { ACCOUNT_CATEGORIES, ASSERTION_IDS } from "@/lib/pre-close/assertions-types";
import type {
  CoverageStatus,
  ProjectedCoverageRow,
  ProjectionInput,
  RootCauseCode,
} from "@/lib/pre-close/assertions-coverage-types";
import {
  assessEvidenceStrength,
  assessFireOnlyStrength,
} from "@/lib/assertions/evidence-strength";
import type { ManualEvidenceType } from "@/lib/pre-close/manual-test-evidence-types";

const EMPTY_MANUAL: string[] = [];

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
          covering_manual_test_ids: EMPTY_MANUAL,
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

      const key = `${account_category}::${assertion_id}`;
      const manualTestsForPair = input.manualTestsByPair?.[key] ?? [];
      const manualInputsEarly = manualTestsForPair.map((mt) => ({
        evidenceId: mt.evidenceId,
        evidenceType: mt.evidenceType as ManualEvidenceType,
        dataSourceReliabilityBasis: mt.dataSourceReliabilityBasis,
      }));

      // Manual tests alone can cover a pair even when no rule is defined
      // (Part 6/7: gap remediation via manual_test_evidence).
      if (coveringRules.length === 0) {
        if (manualInputsEarly.length > 0) {
          const assessment = assessEvidenceStrength({
            fires: [],
            manualTests: manualInputsEarly,
          });
          rows.push({
            account_category,
            assertion_id,
            relevance_at_computation: relevance,
            coverage_status: "tested",
            covering_rule_ids: [],
            covering_fire_ids: [],
            covering_manual_test_ids: manualInputsEarly.map((m) => m.evidenceId),
            evidence_strength: assessment.strength,
            gap_root_cause_code: null,
          });
        } else {
          rows.push({
            account_category,
            assertion_id,
            relevance_at_computation: relevance,
            coverage_status: "gap",
            covering_rule_ids: [],
            covering_fire_ids: [],
            covering_manual_test_ids: EMPTY_MANUAL,
            evidence_strength: "unassessed",
            gap_root_cause_code: "no_rule_defined",
          });
        }
        continue;
      }

      const fireInputs = [];
      for (const rc of coveringRules) {
        const bucket = firesByRule.get(rc.rule_id);
        if (!bucket) continue;
        const outcomes: Array<{ ids: string[]; outcome: "fired" | "suppressed" | "error" }> = [
          { ids: bucket.fired, outcome: "fired" },
          { ids: bucket.suppressed, outcome: "suppressed" },
          { ids: bucket.errored, outcome: "error" },
        ];
        for (const o of outcomes) {
          for (const _fireId of o.ids) {
            fireInputs.push({
              ruleId: rc.rule_id,
              coverageStrength: rc.coverage_strength as "primary" | "secondary" | "partial",
              outcome: o.outcome,
            });
          }
        }
      }

      const firedRuleIds: string[] = [];
      const firedFireIds: string[] = [];
      for (const rc of coveringRules) {
        const bucket = firesByRule.get(rc.rule_id);
        if (!bucket) continue;
        if (bucket.fired.length > 0) {
          firedRuleIds.push(rc.rule_id);
          firedFireIds.push(...bucket.fired);
        }
      }

      const manualInputs = manualInputsEarly;

      const assessment = assessEvidenceStrength({
        fires: fireInputs,
        manualTests: manualInputs,
      });

      const fireOnly = assessFireOnlyStrength(fireInputs);
      let status: CoverageStatus;
      let root: RootCauseCode | null = null;

      if (fireOnly.anyPrimaryFired) {
        status = "tested";
      } else if (fireOnly.anySecondaryFired) {
        status = "partial";
        root = "coverage_partial_by_design";
      } else if (fireOnly.anyPartialFired) {
        status = "partial";
        root = "coverage_partial_by_design";
      } else if (!fireOnly.anyFired && manualInputs.length > 0) {
        status = manualInputs.length >= 1 ? "tested" : "partial";
        root = null;
      } else if (!fireOnly.anyFired && fireOnly.anyErrored) {
        status = "gap";
        root = "rule_errored";
      } else if (!fireOnly.anyFired && fireOnly.anySuppressed) {
        status = "gap";
        root = "rule_fired_but_all_suppressed";
      } else {
        status = "gap";
        root = "rule_defined_but_not_fired";
      }

      rows.push({
        account_category,
        assertion_id,
        relevance_at_computation: relevance,
        coverage_status: status,
        covering_rule_ids: Array.from(new Set(firedRuleIds)),
        covering_fire_ids: Array.from(new Set(firedFireIds)),
        covering_manual_test_ids: manualInputs.map((m) => m.evidenceId),
        evidence_strength: assessment.strength,
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
