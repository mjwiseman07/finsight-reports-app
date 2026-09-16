/**
 * Track 4.5 Block B — Company-scoped bootstrap for RA Pro.
 *
 * Atomic via bootstrap_checkout_company_workspace (no DELETE compensation).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type BootstrapCompanyResult = {
  companyId: string;
  created: boolean;
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
  return new CheckoutCompanyBootstrapError(msg, err.code || "company_bootstrap_failed");
}

export async function bootstrapCompanyForUser(params: {
  admin: SupabaseClient;
  userId: string;
  businessName: string;
}): Promise<BootstrapCompanyResult> {
  const { admin, userId, businessName } = params;
  const { data, error } = await admin.rpc("bootstrap_checkout_company_workspace", {
    p_buyer_user_id: userId,
    p_company_name: businessName,
  });
  if (error) throw mapRpcError(error);
  if (!data || typeof data !== "object" || (data as { ok?: boolean }).ok !== true) {
    throw new CheckoutCompanyBootstrapError(
      "company_bootstrap_invalid_response",
      "company_bootstrap_failed",
    );
  }
  const row = data as { company_id: string; created: boolean };
  return {
    companyId: row.company_id,
    created: Boolean(row.created),
  };
}
