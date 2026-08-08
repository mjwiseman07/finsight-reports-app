/**
 * W1c.2 — Resolve firm_client_id + pilot_slot_id from an AccountingConnectionRecord.
 *
 * Schema note (deviates from paste): firm_clients has NO accounting_connection_id;
 * pilot_slots has NO firm_client_id. Real joins:
 *   - firm_client: metadata_json.firm_client_id OR firm_clients.owner_user_id = connection.user_id
 *   - pilot_slot: metadata_json.pilot_slot_id OR firm_clients.company_id → pilot_slots.company_id
 *                 OR resolveCompanyIdForUser(user_id) → pilot_slots.company_id
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";
import { resolveCompanyIdForUser } from "@/lib/integrations/accounting/resolve-company-id";

export async function resolveFirmClientIdForConnection(
  admin: SupabaseClient,
  connection: AccountingConnectionRecord,
): Promise<string> {
  const metaFcId = connection.metadata_json?.firm_client_id;
  if (typeof metaFcId === "string" && metaFcId.length > 0) return metaFcId;

  const { data, error } = await admin
    .from("firm_clients")
    .select("id")
    .eq("owner_user_id", connection.user_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(
      `resolveFirmClientIdForConnection: query failed for connection ${connection.id}: ${error.message}`,
    );
  }
  if (!data?.id) {
    throw new Error(
      `resolveFirmClientIdForConnection: no firm_clients row for owner_user_id=${connection.user_id} (connection ${connection.id})`,
    );
  }
  return data.id as string;
}

export async function resolvePilotSlotIdForConnection(
  admin: SupabaseClient,
  connection: AccountingConnectionRecord,
  firmClientId?: string,
): Promise<string> {
  const metaSlot = connection.metadata_json?.pilot_slot_id;
  if (typeof metaSlot === "string" && metaSlot.length > 0) return metaSlot;

  let companyId: string | null = null;

  if (firmClientId) {
    const { data: fc, error: fcErr } = await admin
      .from("firm_clients")
      .select("company_id")
      .eq("id", firmClientId)
      .maybeSingle();
    if (fcErr) {
      throw new Error(`resolvePilotSlotIdForConnection firm_clients: ${fcErr.message}`);
    }
    if (typeof fc?.company_id === "string" && fc.company_id.length > 0) {
      companyId = fc.company_id;
    }
  }

  if (!companyId) {
    companyId = await resolveCompanyIdForUser(admin, connection.user_id);
  }

  if (!companyId) {
    throw new Error(
      `resolvePilotSlotIdForConnection: no company for connection ${connection.id} / user ${connection.user_id}`,
    );
  }

  const { data: slot, error: slotErr } = await admin
    .from("pilot_slots")
    .select("id")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (slotErr) {
    throw new Error(`resolvePilotSlotIdForConnection pilot_slots: ${slotErr.message}`);
  }
  if (!slot?.id) {
    throw new Error(
      `resolvePilotSlotIdForConnection: no pilot_slots for company ${companyId}`,
    );
  }
  return slot.id as string;
}
