import type { ExtractedFiling } from "../../scripts/external-truth/types";

export const TAXABLE_HC_FILING_ENTITY: Record<string, { tax_status: string; entity_type: string }> = {
  "CVS-10k": { tax_status: "taxable", entity_type: "pharmacy_chain" },
  "HCA-10k": { tax_status: "taxable", entity_type: "hospital_system" },
  "THC-10k": { tax_status: "taxable", entity_type: "hospital_system" },
  "UHS-10k": { tax_status: "taxable", entity_type: "hospital_system" },
};

export interface HealthcareEntityProfile {
  tax_status: string;
  entity_type: string;
}

export function resolveHealthcareEntity(extracted: ExtractedFiling): HealthcareEntityProfile {
  if (extracted.tax_status && extracted.entity_type) {
    return { tax_status: extracted.tax_status, entity_type: extracted.entity_type };
  }
  const known = TAXABLE_HC_FILING_ENTITY[extracted.filingId];
  if (known) {
    return known;
  }
  return {
    tax_status: extracted.tax_status ?? "unknown",
    entity_type: extracted.entity_type ?? "unknown",
  };
}

export function isChnaScopedHospital(entity: HealthcareEntityProfile): boolean {
  return entity.tax_status === "501(c)(3)" && entity.entity_type === "hospital";
}

export const TAXABLE_HC_ENTITY_TYPES = ["hospital_system", "pharmacy_chain", "physician_group"] as const;

export function isTaxableHcEntity(entity: HealthcareEntityProfile): boolean {
  return (
    entity.tax_status === "taxable" &&
    TAXABLE_HC_ENTITY_TYPES.includes(entity.entity_type as (typeof TAXABLE_HC_ENTITY_TYPES)[number])
  );
}
