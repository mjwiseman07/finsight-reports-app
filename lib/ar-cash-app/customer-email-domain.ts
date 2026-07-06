/**
 * Auto-populate customers.email_domain on first unambiguous match.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";

export interface LearnDomainInput {
  supabase: SupabaseClient;
  firm_id: string;
  company_id: string;
  customer_id: string;
  observed_domain: string;
  source_payment_id: string;
  firm_client_id?: string;
}

export async function maybeLearnEmailDomain(
  input: LearnDomainInput,
): Promise<{ learned: boolean; existing?: string | null }> {
  const {
    supabase,
    customer_id,
    observed_domain,
    firm_id,
    company_id,
    source_payment_id,
    firm_client_id,
  } = input;

  const { data: current, error: readErr } = await supabase
    .from("customers")
    .select("email_domain")
    .eq("id", customer_id)
    .single();

  if (readErr) return { learned: false };
  if (current?.email_domain) return { learned: false, existing: current.email_domain };

  const { data: updated, error: updErr } = await supabase
    .from("customers")
    .update({ email_domain: observed_domain })
    .eq("id", customer_id)
    .is("email_domain", null)
    .select()
    .maybeSingle();

  if (updErr || !updated) return { learned: false };

  await publishEvent({
    eventType: "customer_email_domain_learned",
    eventCategory: "cash_app",
    firmId: firm_id,
    firmClientId: firm_client_id,
    aggregateType: "customer",
    aggregateId: customer_id,
    actorType: "system",
    payload: { observed_domain, source_payment_id, company_id },
  });

  return { learned: true };
}
