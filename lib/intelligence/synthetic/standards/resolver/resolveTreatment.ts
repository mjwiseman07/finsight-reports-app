import { fetchTreatmentContext } from "./fetchTreatmentContext";
import { hashTreatmentDeterminism } from "./hashTreatmentDeterminism";
import { detectDisagreement } from "./org-edge/disagreement-detector";
import type { CuratedRulesProjection } from "./org-edge/disagreement-detector";
import {
  mapFrameworkCodeToFrameworkId,
  mapFrameworkIdToFrameworkCode,
} from "./org-edge/framework-map";
import { NullOrgElectionReader } from "./org-edge/NullOrgElectionReader";
import { OrgElectionConsolidationNotSupportedError } from "./org-edge/types";
import { resolveTreatmentPure } from "./resolveTreatmentPure";
import type { ResolveTreatmentInput, TreatmentResolution, TreatmentResolverDeps } from "./types";

function buildOrgEdgeResolution(
  input: ResolveTreatmentInput,
  deps: TreatmentResolverDeps,
  decision: ReturnType<typeof detectDisagreement>,
): TreatmentResolution {
  const election = decision.election!;
  const chosenFramework = mapFrameworkIdToFrameworkCode(election.framework);
  const matchedRules: string[] = [];
  const advisories =
    decision.kind === "override-with-disagreement" && decision.disagreement
      ? [decision.disagreement]
      : [];

  const treatmentDeterminismHash = hashTreatmentDeterminism({
    orgId: election.orgId,
    framework: election.framework,
    citationHandle: election.citationHandle,
    attestedAt: election.attestedAt,
    advisories,
  });

  return {
    chosenFramework,
    applicableBasisRef: `org-edge:${election.citationHandle}:${input.reportingPeriod.periodKey}`,
    effectiveDate: input.reportingPeriod.fiscalYearEnd,
    treatmentDeterminismHash,
    precedenceReasoning: `Org-edge override: ${election.framework} attested by ${election.attestedBy}`,
    matchedRules,
    unresolvedConflicts: [],
    generatedAt: deps.clock(),
    resolvedBy: "org-edge",
    citationHandle: election.citationHandle,
    advisories,
    election: {
      orgId: election.orgId,
      attestedBy: election.attestedBy,
      attestedAt: election.attestedAt,
    },
  };
}

export async function resolveTreatment(
  input: ResolveTreatmentInput,
  deps: TreatmentResolverDeps,
): Promise<TreatmentResolution> {
  if (input.consolidationContext !== undefined) {
    throw new OrgElectionConsolidationNotSupportedError();
  }

  const reader = deps.orgElectionReader ?? new NullOrgElectionReader();
  const orgId = input.companyMemoryHandle.companyId;
  const election = reader.read(orgId);

  if (election === null) {
    const context = await fetchTreatmentContext(input, deps);
    const resolution = resolveTreatmentPure(context);
    return {
      ...resolution,
      generatedAt: deps.clock(),
    };
  }

  const context = await fetchTreatmentContext(input, deps);
  const curatedResolution = resolveTreatmentPure(context);

  let projectionInvoked = false;
  const projection: CuratedRulesProjection = {
    computeProjectedFramework() {
      projectionInvoked = true;
      return {
        framework: mapFrameworkCodeToFrameworkId(curatedResolution.chosenFramework),
        ruleIds: Object.freeze([...curatedResolution.matchedRules]),
      };
    },
  };

  const decision = detectDisagreement(election, projection);
  if (!projectionInvoked) {
    projection.computeProjectedFramework();
  }

  return buildOrgEdgeResolution(input, deps, decision);
}
