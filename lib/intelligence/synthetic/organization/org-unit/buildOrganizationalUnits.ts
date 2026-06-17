import {
  buildOrganizationalUnit,
  type BuildOrganizationalUnitInput,
  type SyntheticDepartment,
  type SyntheticOrganizationalUnit,
  type SyntheticTeam,
} from "./buildOrganizationalUnit";

export interface BuildOrganizationalUnitsInput {
  units: BuildOrganizationalUnitInput[];
}

export interface BuildOrganizationalUnitsResult {
  organizationalUnits: SyntheticOrganizationalUnit[];
  departments: SyntheticDepartment[];
  teams: SyntheticTeam[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOrganizationalUnits(input: BuildOrganizationalUnitsInput): BuildOrganizationalUnitsResult {
  const organizationalUnits: SyntheticOrganizationalUnit[] = [];
  const departments: SyntheticDepartment[] = [];
  const teams: SyntheticTeam[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.units.forEach((unitInput, index) => {
    const result = buildOrganizationalUnit({
      ...unitInput,
      skippedIndexes: [...(unitInput.skippedIndexes ?? []), index],
    });

    if (result.organizationalUnit) {
      organizationalUnits.push(result.organizationalUnit);
    }

    departments.push(...result.departments);
    teams.push(...result.teams);

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `organizationalUnit[${index}]: ${warning}`));
  });

  return {
    organizationalUnits,
    departments,
    teams,
    skippedIndexes,
    warnings,
  };
}
