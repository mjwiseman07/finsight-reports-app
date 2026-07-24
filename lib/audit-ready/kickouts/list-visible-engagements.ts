import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

/**
 * Enumerate engagement IDs visible to the user via firm_memberships OR company_users.
 * Sequential lookups (not a SQL UNION) per existing pattern in lib/audit-ready/server-auth.ts.
 * Returns empty array when user has no memberships — never throws.
 */
export async function listVisibleEngagementIds(
  userId: string,
): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  const { data: firmMems, error: fmErr } = await supabase
    .from("firm_memberships")
    .select("firm_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (fmErr) {
    console.error("[list-visible-engagements] firm_memberships error", fmErr);
  }
  const firmIds = (firmMems ?? [])
    .map((r: { firm_id: string }) => r.firm_id)
    .filter(Boolean);

  const { data: companyMems, error: cuErr } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (cuErr) {
    console.error("[list-visible-engagements] company_users error", cuErr);
  }
  const companyIds = (companyMems ?? [])
    .map((r: { company_id: string }) => r.company_id)
    .filter(Boolean);

  const engagementIds = new Set<string>();

  if (firmIds.length > 0) {
    const { data: eF } = await supabase
      .from("audit_ready_engagements")
      .select("id")
      .in("firm_id", firmIds);
    for (const row of eF ?? []) engagementIds.add(row.id);
  }

  if (companyIds.length > 0) {
    const { data: eC } = await supabase
      .from("audit_ready_engagements")
      .select("id")
      .in("company_id", companyIds);
    for (const row of eC ?? []) engagementIds.add(row.id);
  }

  return Array.from(engagementIds);
}
