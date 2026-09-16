/**
 * Atomic checkout firm workspace bootstrap (service_role RPC).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type BootstrapFirmWorkspaceResult = {
  firmId: string;
  membershipId: string;
  billingCompanyId: string | null;
  createdFirm: boolean;
  createdMembership: boolean;
};

export class CheckoutFirmBootstrapError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CheckoutFirmBootstrapError";
  }
}

function mapRpcError(err: { message?: string; code?: string }): CheckoutFirmBootstrapError {
  const msg = String(err.message || "workspace_bootstrap_failed");
  if (msg.includes("ra_pro_capacity_lock_busy")) {
    return new CheckoutFirmBootstrapError(
      "workspace_bootstrap_retryable",
      "ra_pro_capacity_lock_busy",
    );
  }
  if (msg.includes("ra_pro_capacity_isolation_unsupported")) {
    return new CheckoutFirmBootstrapError(
      "workspace_bootstrap_retryable",
      "ra_pro_capacity_isolation_unsupported",
    );
  }
  if (msg.includes("ra_pro_seat_cap_reached")) {
    return new CheckoutFirmBootstrapError("seat_cap_reached", "ra_pro_seat_cap_reached");
  }
  if (msg.includes("bootstrap_checkout_buyer_not_company_member")) {
    return new CheckoutFirmBootstrapError(
      "buyer_not_company_member",
      "bootstrap_checkout_buyer_not_company_member",
    );
  }
  if (msg.includes("bootstrap_checkout_company_not_found")) {
    return new CheckoutFirmBootstrapError(
      "company_not_found",
      "bootstrap_checkout_company_not_found",
    );
  }
  if (msg.includes("bootstrap_checkout_firm_forbidden")) {
    return new CheckoutFirmBootstrapError(
      "workspace_bootstrap_forbidden",
      "bootstrap_checkout_firm_forbidden",
    );
  }
  return new CheckoutFirmBootstrapError(msg, err.code || "workspace_bootstrap_failed");
}

export async function bootstrapCheckoutFirmWorkspace(params: {
  admin: SupabaseClient;
  buyerUserId: string;
  firmName: string;
  billingCompanyId?: string | null;
}): Promise<BootstrapFirmWorkspaceResult> {
  const { admin, buyerUserId, firmName, billingCompanyId = null } = params;
  const { data, error } = await admin.rpc("bootstrap_checkout_firm_workspace", {
    p_buyer_user_id: buyerUserId,
    p_firm_name: firmName,
    p_billing_company_id: billingCompanyId,
  });
  if (error) throw mapRpcError(error);
  if (!data || typeof data !== "object" || (data as { ok?: boolean }).ok !== true) {
    throw new CheckoutFirmBootstrapError(
      "workspace_bootstrap_invalid_response",
      "workspace_bootstrap_failed",
    );
  }
  const row = data as {
    firm_id: string;
    membership_id: string;
    billing_company_id: string | null;
    created_firm: boolean;
    created_membership: boolean;
  };
  return {
    firmId: row.firm_id,
    membershipId: row.membership_id,
    billingCompanyId: row.billing_company_id ?? null,
    createdFirm: Boolean(row.created_firm),
    createdMembership: Boolean(row.created_membership),
  };
}
