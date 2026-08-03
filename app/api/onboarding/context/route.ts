import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase TCP1 W2.5 Block 9j — server-authoritative onboarding context.
 * Paid users (active pilot_slots) bypass free-review-lead gates on /onboarding.
 * Always fresh — no cache headers.
 */

async function getSupabaseSsr() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookie set on read-only context — safe to ignore.
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Cookie remove on read-only context — safe to ignore.
          }
        },
      },
    },
  );
}

type SlotRow = {
  id: string;
  tier_key: string;
  pilot_status: string;
  stripe_subscription_id: string | null;
  pricing_structure: string | null;
  pricing_cadence: string | null;
  created_at: string;
};

export async function GET(_req: NextRequest) {
  const supabaseSsr = await getSupabaseSsr();
  const {
    data: { user },
    error: authError,
  } = await supabaseSsr.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({
      auth: false,
      is_paid_user: false,
      is_complimentary: false,
      active_paid_slot: null,
      tier_key: null,
      user_id: null,
      email: null,
    });
  }

  const admin = createServiceClient();
  const candidates: SlotRow[] = [];

  // Prefer firm_memberships (same as checkout/create-session), then owner_user_id.
  let firmId: string | null = null;
  const { data: membership, error: membershipError } = await admin
    .from("firm_memberships")
    .select("firm_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[onboarding/context] firm_memberships lookup failed", membershipError);
  } else if (membership?.firm_id) {
    firmId = membership.firm_id as string;
  }

  if (!firmId) {
    const { data: firm, error: firmError } = await admin
      .from("firms")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (firmError) {
      console.error("[onboarding/context] firms lookup failed", firmError);
    } else {
      firmId = (firm?.id as string | undefined) ?? null;
    }
  }

  if (firmId) {
    const { data: firmSlots, error: slotError } = await admin
      .from("pilot_slots")
      .select(
        "id, tier_key, pilot_status, stripe_subscription_id, pricing_structure, pricing_cadence, created_at",
      )
      .eq("firm_id", firmId)
      .in("pilot_status", ["active", "complimentary"])
      .in("tier_key", ["review_assist", "review_assist_pro", "solo_bookkeeper"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (slotError) {
      console.error("[onboarding/context] firm pilot_slots lookup failed", slotError);
    } else if (firmSlots?.[0]) {
      candidates.push(firmSlots[0] as SlotRow);
    }
  }

  // Company-scoped lookup — RA Pro (Track 4.5 Block B)
  const { data: companyMembership, error: companyMembershipError } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("role", "owner_executive")
    .eq("status", "active")
    .maybeSingle();

  if (companyMembershipError) {
    console.error("[onboarding/context] company_users lookup failed", companyMembershipError);
  } else if (companyMembership?.company_id) {
    const { data: companySlots, error: companySlotError } = await admin
      .from("pilot_slots")
      .select(
        "id, tier_key, pilot_status, stripe_subscription_id, pricing_structure, pricing_cadence, created_at",
      )
      .eq("company_id", companyMembership.company_id)
      .in("tier_key", ["review_assist_pro"])
      .in("pilot_status", ["pending", "active", "complimentary"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (companySlotError) {
      console.error("[onboarding/context] company pilot_slots lookup failed", companySlotError);
    } else if (companySlots?.[0]) {
      candidates.push(companySlots[0] as SlotRow);
    }
  }

  candidates.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const slot = candidates[0] ?? null;

  return NextResponse.json({
    auth: true,
    user_id: user.id,
    email: user.email ?? null,
    is_paid_user: Boolean(slot && slot.pilot_status === "active"),
    is_complimentary: Boolean(slot && slot.pilot_status === "complimentary"),
    active_paid_slot: slot,
    tier_key: slot?.tier_key ?? null,
  });
}
