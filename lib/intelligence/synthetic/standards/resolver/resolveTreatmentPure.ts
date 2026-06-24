import { hashTreatmentDeterminism } from "./hashTreatmentDeterminism";
import type {
  FrameworkCode,
  TreatmentContext,
  TreatmentPrecedenceRule,
  TreatmentResolution,
  UnresolvedConflict,
} from "./types";

const ORG_ELECTION_BOOST = 1000;

interface WeightedRule {
  rule: TreatmentPrecedenceRule;
  effectiveWeight: number;
}

function matchesIndustry(
  rule: TreatmentPrecedenceRule,
  industryCode: TreatmentContext["input"]["industry"]["industryCode"],
): boolean {
  if (rule.industryFilter === "ANY") {
    return true;
  }
  return rule.industryFilter.includes(industryCode);
}

function matchesJurisdiction(rule: TreatmentPrecedenceRule, country: string): boolean {
  if (rule.jurisdictionFilter === "ANY") {
    return true;
  }
  return rule.jurisdictionFilter.countries.includes(country);
}

function filterCandidates(context: TreatmentContext): WeightedRule[] {
  const { input, precedenceTable } = context;

  return precedenceTable.rules
    .filter((rule) => matchesIndustry(rule, input.industry.industryCode))
    .filter((rule) => matchesJurisdiction(rule, input.jurisdiction.country))
    .filter((rule) => !rule.orgElectionRequired || input.orgElection !== null)
    .map((rule) => ({
      rule,
      effectiveWeight:
        rule.precedenceWeight +
        (input.orgElection !== null && rule.orgElectionRequired ? ORG_ELECTION_BOOST : 0),
    }))
    .sort((left, right) => {
      if (right.effectiveWeight !== left.effectiveWeight) {
        return right.effectiveWeight - left.effectiveWeight;
      }
      return left.rule.ruleId.localeCompare(right.rule.ruleId);
    });
}

function buildApplicableBasisRef(
  chosenFramework: FrameworkCode | null,
  periodKey: string,
): string {
  if (chosenFramework === null) {
    return `basisOf:null:${periodKey}`;
  }
  return `basisOf:${chosenFramework}:${periodKey}`;
}

function buildUnresolvedResolution(
  context: TreatmentContext,
  reason: string,
  competingFrameworks: FrameworkCode[],
): TreatmentResolution {
  const conflict: UnresolvedConflict = {
    conflictId: `conflict:${reason}`,
    competingFrameworks,
    reason,
    escalationRequired: true,
  };

  const matchedRules: string[] = [];
  const treatmentDeterminismHash = hashTreatmentDeterminism({
    contextDeterminismHash: context.contextDeterminismHash,
    chosenFramework: null,
    matchedRules,
    unresolvedConflicts: [conflict],
  });

  return {
    chosenFramework: null,
    applicableBasisRef: buildApplicableBasisRef(null, context.input.reportingPeriod.periodKey),
    effectiveDate: context.input.reportingPeriod.fiscalYearEnd,
    treatmentDeterminismHash,
    precedenceReasoning: reason,
    matchedRules,
    unresolvedConflicts: [conflict],
    generatedAt: context.input.reportingPeriod.fiscalYearEnd,
  };
}

function buildConflictResolution(
  context: TreatmentContext,
  topCandidates: WeightedRule[],
): TreatmentResolution {
  const competingFrameworks = [
    ...new Set(topCandidates.map((candidate) => candidate.rule.produces)),
  ].sort();
  const conflict: UnresolvedConflict = {
    conflictId: `conflict:tied_weights:${competingFrameworks.join(":")}`,
    competingFrameworks,
    reason: topCandidates.map((candidate) => candidate.rule.citationRef).join("|"),
    escalationRequired: true,
  };

  const matchedRules: string[] = [];
  const treatmentDeterminismHash = hashTreatmentDeterminism({
    contextDeterminismHash: context.contextDeterminismHash,
    chosenFramework: null,
    matchedRules,
    unresolvedConflicts: [conflict],
  });

  return {
    chosenFramework: null,
    applicableBasisRef: buildApplicableBasisRef(null, context.input.reportingPeriod.periodKey),
    effectiveDate: context.input.reportingPeriod.fiscalYearEnd,
    treatmentDeterminismHash,
    precedenceReasoning: conflict.reason,
    matchedRules,
    unresolvedConflicts: [conflict],
    generatedAt: context.input.reportingPeriod.fiscalYearEnd,
  };
}

function buildSuccessResolution(
  context: TreatmentContext,
  chosenFramework: FrameworkCode,
  matchedRules: string[],
  precedenceReasoning: string,
): TreatmentResolution {
  const treatmentDeterminismHash = hashTreatmentDeterminism({
    contextDeterminismHash: context.contextDeterminismHash,
    chosenFramework,
    matchedRules,
    unresolvedConflicts: [],
  });

  return {
    chosenFramework,
    applicableBasisRef: buildApplicableBasisRef(
      chosenFramework,
      context.input.reportingPeriod.periodKey,
    ),
    effectiveDate: context.input.reportingPeriod.fiscalYearEnd,
    treatmentDeterminismHash,
    precedenceReasoning,
    matchedRules,
    unresolvedConflicts: [],
    generatedAt: context.input.reportingPeriod.fiscalYearEnd,
  };
}

export function resolveTreatmentPure(context: TreatmentContext): TreatmentResolution {
  const { precedenceTable } = context;

  if (precedenceTable.rules.length === 0) {
    return buildUnresolvedResolution(context, "precedence_table_empty", []);
  }

  const candidates = filterCandidates(context);
  if (candidates.length === 0) {
    return buildUnresolvedResolution(context, "no_matching_rules", []);
  }

  const topWeight = candidates[0].effectiveWeight;
  const topCandidates = candidates.filter((candidate) => candidate.effectiveWeight === topWeight);
  const distinctProduces = [...new Set(topCandidates.map((candidate) => candidate.rule.produces))];

  if (distinctProduces.length > 1) {
    return buildConflictResolution(context, topCandidates);
  }

  const matchedRules = topCandidates.map((candidate) => candidate.rule.ruleId).sort();
  const chosenFramework = topCandidates[0].rule.produces;
  const topRule = [...topCandidates].sort((left, right) =>
    left.rule.ruleId.localeCompare(right.rule.ruleId),
  )[0].rule;

  return buildSuccessResolution(context, chosenFramework, matchedRules, topRule.citationRef);
}
