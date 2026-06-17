import {
  buildWorkforceMember,
  type BuildWorkforceMemberInput,
  type SyntheticWorkforceAssignment,
  type SyntheticWorkforceCapability,
  type SyntheticWorkforceMember,
} from "./buildWorkforceMember";

export interface BuildWorkforceMembersInput {
  members: BuildWorkforceMemberInput[];
}

export interface BuildWorkforceMembersResult {
  workforceMembers: SyntheticWorkforceMember[];
  workforceAssignments: SyntheticWorkforceAssignment[];
  workforceCapabilities: SyntheticWorkforceCapability[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildWorkforceMembers(input: BuildWorkforceMembersInput): BuildWorkforceMembersResult {
  const workforceMembers: SyntheticWorkforceMember[] = [];
  const workforceAssignments: SyntheticWorkforceAssignment[] = [];
  const workforceCapabilities: SyntheticWorkforceCapability[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.members.forEach((memberInput, index) => {
    const result = buildWorkforceMember({
      ...memberInput,
      skippedIndexes: [...(memberInput.skippedIndexes ?? []), index],
    });

    if (result.workforceMember) {
      workforceMembers.push(result.workforceMember);
    }

    workforceAssignments.push(...result.assignments);
    workforceCapabilities.push(...result.capabilities);

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `workforceMember[${index}]: ${warning}`));
  });

  return {
    workforceMembers,
    workforceAssignments,
    workforceCapabilities,
    skippedIndexes,
    warnings,
  };
}
