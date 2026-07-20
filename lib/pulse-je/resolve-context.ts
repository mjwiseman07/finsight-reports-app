/**
 * Resolve firm_client + firm context for Pulse JE from ask body / company / impersonation.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { ADVISACOR_IMPERSONATE_FIRM_COOKIE } from "@/lib/demo/impersonation";

export type PulseJeContext = {
  firmClientId: string;
  firmId: string;
  companyId: string;
  homeCurrencyCode: string;
};

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function resolvePulseJeContext(params: {
  request: Request;
  companyId?: string | null;
  firmClientId?: string | null;
}): Promise<PulseJeContext | null> {
  const supabase = getSupabaseAdmin();
  let firmClientId = params.firmClientId?.trim() || null;
  let companyId = params.companyId?.trim() || null;

  if (firmClientId) {
    const { data } = await supabase
      .from("firm_clients")
      .select("id, firm_id, company_id")
      .eq("id", firmClientId)
      .maybeSingle();
    if (!data?.id || !data.firm_id) return null;
    const home = await resolveHomeCurrency(supabase, data.id as string);
    return {
      firmClientId: data.id as string,
      firmId: data.firm_id as string,
      companyId: (data.company_id as string) || companyId || data.id,
      homeCurrencyCode: home,
    };
  }

  if (companyId) {
    const { data } = await supabase
      .from("firm_clients")
      .select("id, firm_id, company_id")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id && data.firm_id) {
      const home = await resolveHomeCurrency(supabase, data.id as string);
      return {
        firmClientId: data.id as string,
        firmId: data.firm_id as string,
        companyId: (data.company_id as string) || companyId,
        homeCurrencyCode: home,
      };
    }
  }

  const impersonatedFirmId = readCookie(
    params.request,
    ADVISACOR_IMPERSONATE_FIRM_COOKIE,
  );
  if (impersonatedFirmId) {
    const { data } = await supabase
      .from("firm_clients")
      .select("id, firm_id, company_id")
      .eq("firm_id", impersonatedFirmId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id && data.firm_id) {
      const home = await resolveHomeCurrency(supabase, data.id as string);
      return {
        firmClientId: data.id as string,
        firmId: data.firm_id as string,
        companyId: (data.company_id as string) || companyId || data.id,
        homeCurrencyCode: home,
      };
    }
  }

  return null;
}

async function resolveHomeCurrency(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  firmClientId: string,
): Promise<string> {
  const { data: fc } = await supabase
    .from("firm_clients")
    .select("owner_user_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (!fc?.owner_user_id) return "USD";
  const { data: conn } = await supabase
    .from("accounting_connections")
    .select("home_currency")
    .eq("user_id", fc.owner_user_id)
    .eq("provider", "quickbooks")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (conn?.home_currency as string) || "USD";
}
