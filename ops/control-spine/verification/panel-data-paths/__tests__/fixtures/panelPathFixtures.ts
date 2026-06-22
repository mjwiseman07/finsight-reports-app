/** Synthetic panel-path fixtures — tag-only, no real PHI. containsVerticalComplianceLogic: false executable: false */

export const SYNTHETIC_PHI_FIELD = {
  taxonomy: "patient-identifier",
  phi: true,
  sourceTenantId: "tenant-healthcare-a",
  value: "SYNTHETIC-001",
} as const;

export const SYNTHETIC_NON_PHI_FIELD = {
  taxonomy: "financial-summary",
  phi: false,
  sourceTenantId: "tenant-healthcare-a",
} as const;

export const TENANT_A_ID = "tenant-a-panel-proof";
export const TENANT_B_ID = "tenant-b-panel-proof";

export const HEALTHCARE_PANEL_ID = "panel:command-center:healthcare-ppd";
export const EXPORT_PANEL_ID = "panel:export:non-overlay";
