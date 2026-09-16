/**
 * Atomic company workspace bootstrap (checkout + company onboarding).
 * RPC: bootstrap_checkout_company_workspace — no DELETE compensation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CompanyBootstrapCanonicalRole = "owner_executive" | "company_admin";

export type BootstrapCompanyResult = {
  companyId: string;
  created: boolean;
  createdMembership?: boolean;
};

export class CheckoutCompanyBootstrapError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CheckoutCompanyBootstrapError";
  }
}

function mapRpcError(err: { message?: string; code?: string }): CheckoutCompanyBootstrapError {
  const msg = String(err.message || "company_bootstrap_failed");
  if (msg.includes("bootstrap_checkout_company_forbidden")) {
    return new CheckoutCompanyBootstrapError(
      "company_bootstrap_forbidden",
      "bootstrap_checkout_company_forbidden",
    );
  }
  if (msg.includes("bootstrap_checkout_ownership_conflict")) {
    return new CheckoutCompanyBootstrapError(
      "workspace_ownership_conflict",
      "bootstrap_checkout_ownership_conflict",
    );
  }
  if (msg.includes("bootstrap_checkout_ownership_revoked")) {
    return new CheckoutCompanyBootstrapError(
      "workspace_ownership_revoked",
      "bootstrap_checkout_ownership_revoked",
    );
  }
  if (msg.includes("bootstrap_checkout_invalid_company_role")) {
    return new CheckoutCompanyBootstrapError(
      "invalid_company_role",
      "bootstrap_checkout_invalid_company_role",
    );
  }
  return new CheckoutCompanyBootstrapError(msg, err.code || "company_bootstrap_failed");
}

export async function bootstrapCompanyForUser(params: {
  admin: SupabaseClient;
  userId: string;
  businessName: string;
  canonicalRole?: CompanyBootstrapCanonicalRole;
}): Promise<BootstrapCompanyResult> {
  const {
    admin,
    userId,
    businessName,
    canonicalRole = "owner_executive",
  } = params;
  const { data, error } = await admin.rpc("bootstrap_checkout_company_workspace", {
    p_buyer_user_id: userId,
    p_company_name: businessName,
    p_canonical_role: canonicalRole,
  });
  if (error) throw mapRpcError(error);
  if (!data || typeof data !== "object" || (data as { ok?: boolean }).ok !== true) {
    throw new CheckoutCompanyBootstrapError(
      "company_bootstrap_invalid_response",
      "company_bootstrap_failed",
    );
  }
  const row = data as {
    company_id: string;
    created: boolean;
    created_membership?: boolean;
  };
  return {
    companyId: row.company_id,
    created: Boolean(row.created),
    createdMembership: Boolean(row.created_membership),
  };
}
