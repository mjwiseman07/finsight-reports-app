import {
  buildPartnerHelperRole,
  type BuildPartnerHelperRoleInput,
  type SyntheticPartnerHelperRole,
} from "./buildPartnerHelperRole";

export interface BuildPartnerHelperRolesInput {
  roles: BuildPartnerHelperRoleInput[];
}

export interface BuildPartnerHelperRolesResult {
  partnerHelperRoles: SyntheticPartnerHelperRole[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildPartnerHelperRoles(input: BuildPartnerHelperRolesInput): BuildPartnerHelperRolesResult {
  const partnerHelperRoles: SyntheticPartnerHelperRole[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.roles.forEach((roleInput, index) => {
    const result = buildPartnerHelperRole({
      ...roleInput,
      skippedIndexes: [...(roleInput.skippedIndexes ?? []), index],
    });

    if (result.partnerHelperRole) {
      partnerHelperRoles.push(result.partnerHelperRole);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `role[${index}]: ${warning}`));
  });

  return {
    partnerHelperRoles,
    skippedIndexes,
    warnings,
  };
}
