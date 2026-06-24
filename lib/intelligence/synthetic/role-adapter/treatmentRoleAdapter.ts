import { createHash } from "node:crypto";
import type { FrameworkCode } from "../standards/resolver/types";
import { selectEscalationTarget } from "./escalationRegistry";
import type {
  FrameworkDisambiguationTask,
  RoleAdapterResult,
  RoleEnvelope,
  TreatmentResolution,
} from "./types";
import type { UnresolvedConflict } from "../standards/resolver/types";

interface BuildArgs {
  resolution: TreatmentResolution;
  envelope: RoleEnvelope;
  jurisdictionCountry: string;
  industryCode: string;
}

type ExtendedConflict = UnresolvedConflict & {
  ruleId?: string;
  producedFramework?: FrameworkCode;
  citationRef?: string;
};

type ExtendedResolution = TreatmentResolution & {
  citationHandlesConsulted?: string[];
};

const WORKER_INSTRUCTIONS = [
  "You are an AI worker assigned to resolve a framework disambiguation task.",
  "Read every conflictingCitation in full before choosing a candidateFramework.",
  "If the citations + your role's job description + the company's attested governance",
  "support a single candidateFramework, attest your selection with the supporting",
  "citation handles and proceed. If you cannot disambiguate with full confidence,",
  "escalate to the named escalationTarget — do not guess.",
].join(" ");

function hashContext(args: BuildArgs, outcome: string): string {
  const hash = createHash("sha256");
  hash.update(outcome);
  hash.update("|");
  hash.update(args.envelope.role);
  hash.update("|");
  hash.update(args.envelope.companyId);
  hash.update("|");
  hash.update(args.envelope.taskId);
  hash.update("|");
  hash.update(args.resolution.chosenFramework ?? "null");
  hash.update("|");
  hash.update(args.industryCode);
  hash.update("|");
  hash.update(args.jurisdictionCountry);
  return hash.digest("hex").slice(0, 32);
}

function extractCandidateFrameworks(conflicts: UnresolvedConflict[]): FrameworkCode[] {
  const extended = conflicts as ExtendedConflict[];
  const frameworks: FrameworkCode[] = [];
  for (const conflict of extended) {
    if (conflict.producedFramework) {
      frameworks.push(conflict.producedFramework);
    }
    if (Array.isArray(conflict.competingFrameworks)) {
      frameworks.push(...conflict.competingFrameworks);
    }
  }
  return Array.from(new Set(frameworks));
}

function extractConflictingRuleIds(resolution: TreatmentResolution): string[] {
  const extended = resolution.unresolvedConflicts as ExtendedConflict[];
  const fromConflicts = extended
    .map((conflict) => conflict.ruleId)
    .filter((ruleId): ruleId is string => typeof ruleId === "string" && ruleId.length > 0);
  if (fromConflicts.length > 0) {
    return fromConflicts;
  }
  return resolution.matchedRules;
}

function extractConflictingCitations(resolution: TreatmentResolution): string[] {
  const extended = resolution.unresolvedConflicts as ExtendedConflict[];
  const fromRefs = extended
    .map((conflict) => conflict.citationRef)
    .filter((citationRef): citationRef is string => typeof citationRef === "string" && citationRef.length > 0);
  if (fromRefs.length > 0) {
    return Array.from(new Set(fromRefs));
  }
  return Array.from(
    new Set(
      resolution.unresolvedConflicts
        .flatMap((conflict) => conflict.reason.split("|"))
        .map((part) => part.trim())
        .filter((part) => part.length > 0),
    ),
  );
}

function buildDisambiguationTask(args: BuildArgs): FrameworkDisambiguationTask {
  const resolution = args.resolution;
  return {
    taskType: "framework_disambiguation",
    candidateFrameworks: extractCandidateFrameworks(resolution.unresolvedConflicts),
    conflictingRuleIds: extractConflictingRuleIds(resolution),
    conflictingCitations: extractConflictingCitations(resolution),
    jurisdictionCountry: args.jurisdictionCountry,
    industryCode: args.industryCode,
    reasoning: resolution.precedenceReasoning ?? "",
    workerInstructions: WORKER_INSTRUCTIONS,
  };
}

export function adaptTreatmentForRole(args: BuildArgs): RoleAdapterResult {
  const resolution = args.resolution as ExtendedResolution;

  if (resolution.chosenFramework !== null) {
    return {
      outcome: "resolved",
      role: args.envelope.role,
      companyId: args.envelope.companyId,
      taskId: args.envelope.taskId,
      chosenFramework: resolution.chosenFramework,
      applicableBasisRef: resolution.applicableBasisRef,
      precedenceReasoning: resolution.precedenceReasoning ?? "",
      citationHandles: Array.from(
        new Set(resolution.citationHandlesConsulted ?? resolution.matchedRules),
      ),
      contextHash: hashContext(args, "resolved"),
    };
  }

  const disambiguationTask = buildDisambiguationTask(args);
  const escalationTarget = selectEscalationTarget({
    industryCode: args.industryCode,
    jurisdictionCountry: args.jurisdictionCountry,
    companyId: args.envelope.companyId,
  });

  if (escalationTarget !== null) {
    return {
      outcome: "unresolved",
      role: args.envelope.role,
      companyId: args.envelope.companyId,
      taskId: args.envelope.taskId,
      disambiguationTask,
      escalationTarget,
      contextHash: hashContext(args, "unresolved"),
    };
  }

  return {
    outcome: "fail_closed",
    role: args.envelope.role,
    companyId: args.envelope.companyId,
    taskId: args.envelope.taskId,
    reason:
      "Resolver returned unresolved conflicts and no escalation target matched in escalation-registry.json. " +
      "Add a founder-authored entry to the registry covering this scope.",
    disambiguationTask,
    contextHash: hashContext(args, "fail_closed"),
  };
}
