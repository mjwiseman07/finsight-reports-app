import { fetchTreatmentContext } from "./fetchTreatmentContext";
import { hashTreatmentDeterminism } from "./hashTreatmentDeterminism";
import {
  buildCacheKey,
  buildElectionFingerprint,
  RESOLVER_INTERNAL,
} from "./memory";
import type { CacheEntry } from "./memory/types";
import type { FrameworkId } from "./org-edge/types";
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

async function resolveTreatmentUncached(
  input: ResolveTreatmentInput,
  deps: TreatmentResolverDeps,
): Promise<TreatmentResolution> {
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

function frameworkForCacheKey(
  input: ResolveTreatmentInput,
  election: ReturnType<NullOrgElectionReader["read"]>,
): FrameworkId | null {
  if (election) {
    return election.framework;
  }
  if (input.orgElection?.electedFramework) {
    return mapFrameworkCodeToFrameworkId(input.orgElection.electedFramework);
  }
  return null;
}

function frameworkFromResolution(resolution: TreatmentResolution): FrameworkId {
  return mapFrameworkCodeToFrameworkId(resolution.chosenFramework);
}

export async function resolveTreatment(
  input: ResolveTreatmentInput,
  deps: TreatmentResolverDeps,
): Promise<TreatmentResolution> {
  if (input.consolidationContext !== undefined) {
    throw new OrgElectionConsolidationNotSupportedError();
  }

  const memoCache = deps.memoCache;
  const useCache = memoCache && deps.memoCacheConfig?.mode !== "per-request";

  if (useCache) {
    const reader = deps.orgElectionReader ?? new NullOrgElectionReader();
    const orgId = input.companyMemoryHandle.companyId;
    const election = reader.read(orgId);
    const fingerprint = buildElectionFingerprint(election);
    const classification = deps.tenantClassifier?.classify(orgId) ?? "standard";
    const frameworkHint = frameworkForCacheKey(input, election);

    if (frameworkHint) {
      const cacheKey = buildCacheKey({
        companyMemoryHandle: orgId,
        framework: frameworkHint,
        electionFingerprint: fingerprint,
        tenantClassification: classification,
      });
      const cached = memoCache.get(cacheKey, RESOLVER_INTERNAL);
      if (cached) {
        return cached.value;
      }
    }
  }

  const resolution = await resolveTreatmentUncached(input, deps);

  if (useCache && memoCache) {
    const orgId = input.companyMemoryHandle.companyId;
    const reader = deps.orgElectionReader ?? new NullOrgElectionReader();
    const election = reader.read(orgId);
    const fingerprint = buildElectionFingerprint(election);
    const classification = deps.tenantClassifier?.classify(orgId) ?? "standard";
    const framework = frameworkFromResolution(resolution);
    const now = deps.clockMs?.() ?? Date.now();
    const ttlMs =
      classification === "phi-covered"
        ? (deps.memoCacheConfig?.phiCoveredTTLMs ?? 60 * 60 * 1000)
        : (deps.memoCacheConfig?.standardTTLMs ?? 6 * 60 * 60 * 1000);

    const cacheKey = buildCacheKey({
      companyMemoryHandle: orgId,
      framework,
      electionFingerprint: fingerprint,
      tenantClassification: classification,
    });

    const entry: CacheEntry<TreatmentResolution> = Object.freeze({
      value: resolution,
      writtenAt: now,
      expiresAt: now + ttlMs,
      classification,
      electionFingerprint: fingerprint,
      framework,
    });
    memoCache.set(cacheKey, entry, RESOLVER_INTERNAL);
  }

  return resolution;
}

export function getResolverCacheMetrics(deps: TreatmentResolverDeps) {
  return deps.memoCache?.getCacheMetrics() ?? null;
}
