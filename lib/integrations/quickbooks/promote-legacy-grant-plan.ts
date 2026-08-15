/**
 * Firm-client/company-anchored plan for promoting an already-authorized
 * legacy QBO grant into accounting_connections.
 *
 * Pure planning only — no DB writes. The ops script must not call
 * resolveOrCreateCompanyForProvider for this repair path.
 */
export type LegacyQboGrantRef = {
  id: string;
  userId: string;
  realmId: string;
  legacyTable: "quickbooks_connections" | "erp_connections";
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiry: string | null;
};

export type FirmClientAnchor = {
  id: string;
  ownerUserId: string;
  companyId: string;
};

export type CompanyAnchor = {
  id: string;
  qboRealmId: string | null;
};

export type PromoteLegacyGrantPlanOk = {
  ok: true;
  companyBind: "bind_existing_company" | "noop_already_bound";
  companyId: string;
  firmClientId: string;
  ownerUserId: string;
  expectedRealmId: string;
  legacy: LegacyQboGrantRef;
  notes: string[];
};

export type PromoteLegacyGrantPlanFail = {
  ok: false;
  code:
    | "missing_firm_client"
    | "missing_company"
    | "owner_mismatch"
    | "company_mismatch"
    | "legacy_realm_mismatch"
    | "company_realm_conflict"
    | "realm_owned_by_other_company"
    | "missing_tokens";
  message: string;
};

export type PromoteLegacyGrantPlan = PromoteLegacyGrantPlanOk | PromoteLegacyGrantPlanFail;

export type PlanPromoteLegacyQboGrantInput = {
  expectedRealmId: string;
  legacy: LegacyQboGrantRef;
  firmClient: FirmClientAnchor | null;
  company: CompanyAnchor | null;
  /** Another companies row (≠ firm_client.company_id) already holding expectedRealmId. */
  otherCompanyOwningRealm: { id: string; name?: string | null } | null;
  /** Optional explicit company id; must equal firm_client.company_id when both set. */
  explicitCompanyId?: string | null;
};

/**
 * Plan a one-time production repair that binds the existing firm-client company
 * to the expected production realm and persists a canonical grant against that
 * same company. Never invents a new company identity.
 */
export function planPromoteLegacyQboGrant(
  input: PlanPromoteLegacyQboGrantInput,
): PromoteLegacyGrantPlan {
  const expectedRealmId = String(input.expectedRealmId || "").trim();
  const legacy = input.legacy;

  if (!expectedRealmId) {
    return {
      ok: false,
      code: "legacy_realm_mismatch",
      message: "expectedRealmId is required",
    };
  }

  if (legacy.realmId !== expectedRealmId) {
    return {
      ok: false,
      code: "legacy_realm_mismatch",
      message: `Legacy realm ${legacy.realmId} does not match expected ${expectedRealmId}`,
    };
  }

  if (!legacy.hasAccessToken || !legacy.hasRefreshToken) {
    return {
      ok: false,
      code: "missing_tokens",
      message: "Legacy grant is missing access_token or refresh_token",
    };
  }

  if (!input.firmClient) {
    return {
      ok: false,
      code: "missing_firm_client",
      message: "firmClientId is required and must resolve to an existing firm_client",
    };
  }

  if (!input.firmClient.companyId) {
    return {
      ok: false,
      code: "missing_company",
      message: `firm_client ${input.firmClient.id} has no company_id`,
    };
  }

  if (input.firmClient.ownerUserId !== legacy.userId) {
    return {
      ok: false,
      code: "owner_mismatch",
      message: `firm_client owner ${input.firmClient.ownerUserId} does not match legacy user ${legacy.userId}`,
    };
  }

  const explicit = input.explicitCompanyId ? String(input.explicitCompanyId).trim() : "";
  if (explicit && explicit !== input.firmClient.companyId) {
    return {
      ok: false,
      code: "company_mismatch",
      message: `explicit companyId ${explicit} does not match firm_client.company_id ${input.firmClient.companyId}`,
    };
  }

  if (!input.company) {
    return {
      ok: false,
      code: "missing_company",
      message: `company ${input.firmClient.companyId} not found`,
    };
  }

  if (input.company.id !== input.firmClient.companyId) {
    return {
      ok: false,
      code: "company_mismatch",
      message: `loaded company ${input.company.id} does not match firm_client.company_id ${input.firmClient.companyId}`,
    };
  }

  const currentRealm = input.company.qboRealmId ? String(input.company.qboRealmId).trim() : "";

  if (currentRealm && currentRealm !== expectedRealmId) {
    return {
      ok: false,
      code: "company_realm_conflict",
      message: `company ${input.company.id} already bound to realm ${currentRealm}; refusing to overwrite with ${expectedRealmId}`,
    };
  }

  if (
    input.otherCompanyOwningRealm &&
    input.otherCompanyOwningRealm.id &&
    input.otherCompanyOwningRealm.id !== input.company.id
  ) {
    return {
      ok: false,
      code: "realm_owned_by_other_company",
      message: `realm ${expectedRealmId} already owned by company ${input.otherCompanyOwningRealm.id}; refusing duplicate company identity`,
    };
  }

  const companyBind: PromoteLegacyGrantPlanOk["companyBind"] = currentRealm
    ? "noop_already_bound"
    : "bind_existing_company";

  const notes =
    companyBind === "bind_existing_company"
      ? [
          "Execute will set companies.qbo_realm_id on the existing firm-client company.",
          "Canonical grant companyId will equal firm_client.company_id.",
          "No new company will be created.",
        ]
      : [
          "Company already bound to expected realm; execute will only persist/reconnect canonical grant.",
          "Canonical grant companyId will equal firm_client.company_id.",
          "No new company will be created.",
        ];

  return {
    ok: true,
    companyBind,
    companyId: input.firmClient.companyId,
    firmClientId: input.firmClient.id,
    ownerUserId: input.firmClient.ownerUserId,
    expectedRealmId,
    legacy,
    notes,
  };
}
