import { supabaseAdmin } from "@/lib/supabase";

/**
 * Resolve the caller's active company membership.
 * Prefer an explicit companyId from the client when present; otherwise first active membership.
 */
export async function getActiveCompanyForUser(
  userId: string,
  preferredCompanyId?: string | null,
): Promise<{ id: string } | null> {
  if (!supabaseAdmin || !userId) return null;

  const preferred = String(preferredCompanyId || "").trim();
  if (preferred) {
    const { data, error } = await supabaseAdmin
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .eq("company_id", preferred)
      .eq("status", "active")
      .maybeSingle();
    if (!error && data?.company_id) return { id: String(data.company_id) };
  }

  const { data, error } = await supabaseAdmin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data?.company_id) return null;
  return { id: String(data.company_id) };
}
