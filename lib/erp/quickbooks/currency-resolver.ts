/**
 * Phase MC-3 — Currency resolver (Issue #6, Gap X-1).
 *
 * Resolves the transaction currency + home currency for a QBO JE post.
 * Pure with respect to DB shape (takes a Supabase client) and QBO (never
 * touches Intuit).
 *
 * Resolution precedence:
 *   1. Explicit — `requestedCurrency` (from JEPayload.currency)
 *   2. Implicit — accounting_connections.home_currency for the tenant
 *   3. Fail loud — reject if neither present
 *
 * Never throws; returns `{ ok: false, reason }` for the poster to finalize.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type CurrencyResolution =
  | {
      ok: true;
      currency: string; // uppercased ISO 4217
      home_currency: string; // uppercased ISO 4217
      source: "explicit" | "home_currency_default";
    }
  | {
      ok: false;
      reason: "home_currency_missing" | "invalid_currency_format";
    };

const ISO_4217_RE = /^[A-Z]{3}$/;

export async function resolveCurrencyForFirmClient(
  supabase: SupabaseClient,
  firmClientId: string,
  requestedCurrency: string | undefined,
): Promise<CurrencyResolution> {
  const { data: firmClient } = await supabase
    .from("firm_clients")
    .select("owner_user_id")
    .eq("id", firmClientId)
    .maybeSingle();

  if (!firmClient?.owner_user_id) {
    return { ok: false, reason: "home_currency_missing" };
  }

  const { data: connRow } = await supabase
    .from("accounting_connections")
    .select("home_currency")
    .eq("user_id", firmClient.owner_user_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const homeCurrency = connRow?.home_currency
    ? String(connRow.home_currency).toUpperCase()
    : null;

  if (!homeCurrency || !ISO_4217_RE.test(homeCurrency)) {
    return { ok: false, reason: "home_currency_missing" };
  }

  if (requestedCurrency) {
    const upper = requestedCurrency.toUpperCase();
    if (!ISO_4217_RE.test(upper)) {
      return { ok: false, reason: "invalid_currency_format" };
    }
    return {
      ok: true,
      currency: upper,
      home_currency: homeCurrency,
      source: "explicit",
    };
  }

  return {
    ok: true,
    currency: homeCurrency,
    home_currency: homeCurrency,
    source: "home_currency_default",
  };
}
