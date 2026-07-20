// File: lib/demo/constants.ts
//
// Fixed IDs and emails for the RA + RA Pro demo firms. Import from DEMO-3
// (super-admin impersonation UI) and DEMO-4 (smoke runbook). Do not hard-code
// UUIDs anywhere else — always import from here.

export const SUPER_ADMIN_USER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";

export const RA_FIRM_ID = "11111111-1111-1111-1111-111111111111";
export const RA_PRO_FIRM_ID = "22222222-2222-2222-2222-222222222222";

export const RA_FIRM_CLIENT_ID = "41111111-1111-1111-1111-111111111111";
export const RA_PRO_FIRM_CLIENT_ID = "42222222-2222-2222-2222-222222222222";

export const RA_COMPANY_ID = "31111111-1111-1111-1111-111111111111";
export const RA_PRO_COMPANY_ID = "32222222-2222-2222-2222-222222222222";

// Sandbox holder auth users — each one holds a single Intuit sandbox connection.
// The DEMO-3 picker swaps firm_client.owner_user_id between these to change
// which sandbox the demo firm points at.
export interface SandboxHolderSpec {
  readonly email: string;
  readonly label: string;
}

export const RA_SANDBOX_HOLDERS: readonly SandboxHolderSpec[] = [
  { email: "demo-ra-sandbox-1@advisacor.internal", label: "RA Sandbox Slot 1" },
  { email: "demo-ra-sandbox-2@advisacor.internal", label: "RA Sandbox Slot 2" },
  { email: "demo-ra-sandbox-3@advisacor.internal", label: "RA Sandbox Slot 3" },
] as const;

export const RA_PRO_SANDBOX_HOLDERS: readonly SandboxHolderSpec[] = [
  { email: "demo-rapro-sandbox-1@advisacor.internal", label: "RA Pro Sandbox Slot 1" },
  { email: "demo-rapro-sandbox-2@advisacor.internal", label: "RA Pro Sandbox Slot 2" },
  { email: "demo-rapro-sandbox-3@advisacor.internal", label: "RA Pro Sandbox Slot 3" },
] as const;

export interface DemoFirmSpec {
  readonly firmId: string;
  readonly firmClientId: string;
  readonly companyId: string;
  readonly tierKey: "review_assist" | "review_assist_pro";
  readonly firmName: string;
  readonly companyName: string;
  readonly clientName: string;
  readonly holders: readonly SandboxHolderSpec[];
  readonly complimentaryCap: number;
}

export const DEMO_FIRMS: readonly DemoFirmSpec[] = [
  {
    firmId: RA_FIRM_ID,
    firmClientId: RA_FIRM_CLIENT_ID,
    companyId: RA_COMPANY_ID,
    tierKey: "review_assist",
    firmName: "Advisacor Demo — Review Assist Firm",
    companyName: "Advisacor Demo Client (RA)",
    clientName: "Advisacor Demo Client (RA)",
    holders: RA_SANDBOX_HOLDERS,
    complimentaryCap: 5,
  },
  {
    firmId: RA_PRO_FIRM_ID,
    firmClientId: RA_PRO_FIRM_CLIENT_ID,
    companyId: RA_PRO_COMPANY_ID,
    tierKey: "review_assist_pro",
    firmName: "Advisacor Demo — Review Assist Pro Firm",
    companyName: "Advisacor Demo Client (RA Pro)",
    clientName: "Advisacor Demo Client (RA Pro)",
    holders: RA_PRO_SANDBOX_HOLDERS,
    complimentaryCap: 10,
  },
] as const;

export function isDemoFirmId(firmId: string): boolean {
  return firmId === RA_FIRM_ID || firmId === RA_PRO_FIRM_ID;
}
