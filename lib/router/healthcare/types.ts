import type { ExtractedFiling } from "../../../scripts/external-truth/types";

const TAXABLE_HC_FILINGS = new Set(["CVS-10k", "HCA-10k", "THC-10k", "UHS-10k"]);

export interface HealthcareEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  tax_status: string;
  entity_type: string;
  isChnaScopedHospital: boolean;
}

export function isChnaScopedHospitalEntity(tax_status: string, entity_type: string): boolean {
  return tax_status === "501(c)(3)" && entity_type === "hospital";
}

export function buildHealthcareEmitterInput(extracted: ExtractedFiling): HealthcareEmitterInput {
  const narrativeHaystack = extracted.narrativeSnippets.join(" ");
  let tax_status = extracted.tax_status ?? "unknown";
  let entity_type = extracted.entity_type ?? "unknown";

  if (tax_status === "unknown" && TAXABLE_HC_FILINGS.has(extracted.filingId)) {
    tax_status = "taxable";
    entity_type = entity_type === "unknown" ? "health_system" : entity_type;
  }

  return {
    extracted,
    narrativeHaystack,
    tax_status,
    entity_type,
    isChnaScopedHospital: isChnaScopedHospitalEntity(tax_status, entity_type),
  };
}
