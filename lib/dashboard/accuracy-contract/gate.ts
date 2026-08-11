import type { SupabaseClient } from '@supabase/supabase-js';

export type EntitlementDecision =
  | { allowed: true; pilotSlotId: string; tierKey: string }
  | { allowed: false; reason: string };

export async function checkAccuracyContractGate(
  admin: SupabaseClient,
  args: { userId: string; companyId: string },
): Promise<EntitlementDecision> {
  const { data: membership, error: memErr } = await admin
    .from('company_users')
    .select('role, status')
    .eq('company_id', args.companyId)
    .eq('user_id', args.userId)
    .eq('status', 'active')
    .maybeSingle();

  if (memErr || !membership) {
    return { allowed: false, reason: 'no_active_membership' };
  }

  const { data: slot, error: slotErr } = await admin
    .from('pilot_slots')
    .select('id, tier_key, pilot_status')
    .eq('company_id', args.companyId)
    .in('pilot_status', ['active', 'trialing'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (slotErr) {
    return { allowed: false, reason: `slot_query_failed:${slotErr.message}` };
  }
  if (!slot) {
    return { allowed: false, reason: 'no_active_pilot_slot' };
  }

  return {
    allowed: true,
    pilotSlotId: slot.id as string,
    tierKey: slot.tier_key as string,
  };
}
