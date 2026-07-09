// TODO(Block 6.1): wire `pulse_intelligence` gate into
// app/api/pulse/ask/route.js and app/api/pulse/refund-intent/route.js
// once the pulse auth wrapper is confirmed.
//
// Review Assist route guard — 403 response builder used by write endpoints
// that Review Assist tier must not reach.
//
// Reads the firm-scoped entitlement via lib/entitlements.js hasFlag().
// Returns a NextResponse 403 when the flag is missing/false, else null.
//
// Reference: Track_C_Phase_1_Tier_Spec_v1_2_Review_Assist_Addendum, Block 5.
import { NextResponse } from 'next/server';
// @ts-expect-error — entitlements.js is a plain JS module (no types file)
import { hasFlag } from '@/lib/entitlements';

export type GateFlagKey =
  | 'full_assertion_output'
  | 'close_packet_generation'
  | 'pulse_intelligence'
  | 'qbo_write_back';

/**
 * Require that the firm subscription has `flagKey` enabled.
 * Returns a 403 NextResponse when denied, null when allowed.
 *
 * subscriberType is always 'firm' for the Block 6 gate set — every gated
 * endpoint runs under a firm subscription in the Track C tier model.
 * If a caller ever needs 'company' scope, pass it explicitly.
 */
export async function requireFlag(
  firmId: string,
  flagKey: GateFlagKey,
  subscriberType: 'firm' | 'company' = 'firm',
): Promise<NextResponse | null> {
  const allowed = await hasFlag(subscriberType, firmId, flagKey);
  if (allowed) return null;
  return NextResponse.json(
    {
      error: 'Feature not included in current plan',
      code: 'ENTITLEMENT_DENIED',
      required_flag: flagKey,
    },
    { status: 403 },
  );
}
