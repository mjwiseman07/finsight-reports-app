/**
 * Track 4.5 Block B — Company-scoped bootstrap for RA Pro.
 *
 * Mirror of the inline firm bootstrap in
 * app/api/checkout/create-session/route.ts. Extracted because RA Pro is
 * subscriptionEntity='company' and needs its own path.
 *
 * Idempotent: if the user already has an active company_users row with
 * role='owner_executive', returns that company_id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type BootstrapCompanyResult = {
  companyId: string;
  created: boolean;
};

export async function bootstrapCompanyForUser(params: {
  admin: SupabaseClient;
  userId: string;
  businessName: string;
}): Promise<BootstrapCompanyResult> {
  const { admin, userId, businessName } = params;

  const { data: existing, error: lookupErr } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("role", "owner_executive")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (lookupErr) {
    console.error("[bootstrapCompanyForUser] company_users lookup failed", lookupErr);
    throw new Error("company_membership_lookup_failed");
  }
  if (existing?.company_id) {
    return { companyId: existing.company_id as string, created: false };
  }

  const { data: newCompany, error: companyErr } = await admin
    .from("companies")
    .insert({
      name: businessName,
      primary_persona: "business-owner",
      package_level: "essential",
      billing_status: "trial",
      onboarding_status: "not_started",
      account_type: "my-own-company",
      industry_type: "Other",
    })
    .select("id")
    .single();
  if (companyErr || !newCompany) {
    console.error("[bootstrapCompanyForUser] companies insert failed", companyErr);
    throw new Error("company_create_failed");
  }
  const companyId = newCompany.id as string;

  const { error: memberErr } = await admin
    .from("company_users")
    .insert({
      company_id: companyId,
      user_id: userId,
      role: "owner_executive",
      status: "active",
    });
  if (memberErr) {
    console.error("[bootstrapCompanyForUser] company_users insert failed", memberErr);
    // Best-effort rollback so a retry doesn't hit stale orphan.
    await admin.from("companies").delete().eq("id", companyId);
    throw new Error("company_membership_create_failed");
  }

  return { companyId, created: true };
}
