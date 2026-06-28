import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { isChnaScopedHospital, resolveHealthcareEntity } from "../../../assertion-packs/healthcare/entity";

export interface HealthcareEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  tax_status: string;
  entity_type: string;
  isChnaScopedHospital: boolean;
}

export { isChnaScopedHospital as isChnaScopedHospitalEntity } from "../../../assertion-packs/healthcare/entity";

export function buildHealthcareEmitterInput(extracted: ExtractedFiling): HealthcareEmitterInput {
  const entity = resolveHealthcareEntity(extracted);
  const narrativeHaystack = extracted.narrativeSnippets.join(" ");
  return {
    extracted,
    narrativeHaystack,
    tax_status: entity.tax_status,
    entity_type: entity.entity_type,
    isChnaScopedHospital: isChnaScopedHospital(entity),
  };
}
