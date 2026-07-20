import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PolicyBody = {
  policy_mode?: "aggressive" | "standard" | "conservative" | "custom";
  auto_reconcile_max_dollar?: number;
  auto_reconcile_max_percent?: number;
  kickout_min_dollar?: number;
  kickout_min_percent?: number;
  authoritative_comparison?: "dollar_only" | "percent_only" | "tighter_of_both";
};

const PRESETS: Record<
  "aggressive" | "standard" | "conservative",
  Omit<PolicyBody, "policy_mode">
> = {
  aggressive: {
    auto_reconcile_max_dollar: 5,
    auto_reconcile_max_percent: 0.001,
    kickout_min_dollar: 250,
    kickout_min_percent: 0.05,
    authoritative_comparison: "tighter_of_both",
  },
  standard: {
    auto_reconcile_max_dollar: 25,
    auto_reconcile_max_percent: 0.005,
    kickout_min_dollar: 1000,
    kickout_min_percent: 0.1,
    authoritative_comparison: "tighter_of_both",
  },
  conservative: {
    auto_reconcile_max_dollar: 100,
    auto_reconcile_max_percent: 0.01,
    kickout_min_dollar: 5000,
    kickout_min_percent: 0.2,
    authoritative_comparison: "tighter_of_both",
  },
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("audit_ready_tie_out_policies")
    .select("*")
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({
      exists: false,
      default_preview: { policy_mode: "aggressive", ...PRESETS.aggressive },
    });
  }
  return NextResponse.json({ exists: true, policy: data });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!actor.canWrite) {
    return NextResponse.json({ error: "read_only" }, { status: 403 });
  }
  let body: PolicyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const mode = body.policy_mode || "aggressive";
  const preset = mode === "custom" ? undefined : PRESETS[mode];
  const merged = {
    policy_mode: mode,
    auto_reconcile_max_dollar:
      body.auto_reconcile_max_dollar ??
      preset?.auto_reconcile_max_dollar ??
      PRESETS.aggressive.auto_reconcile_max_dollar,
    auto_reconcile_max_percent:
      body.auto_reconcile_max_percent ??
      preset?.auto_reconcile_max_percent ??
      PRESETS.aggressive.auto_reconcile_max_percent,
    kickout_min_dollar:
      body.kickout_min_dollar ??
      preset?.kickout_min_dollar ??
      PRESETS.aggressive.kickout_min_dollar,
    kickout_min_percent:
      body.kickout_min_percent ??
      preset?.kickout_min_percent ??
      PRESETS.aggressive.kickout_min_percent,
    authoritative_comparison:
      body.authoritative_comparison ??
      preset?.authoritative_comparison ??
      "tighter_of_both",
  };
  // Guard rails mirror the CHECK constraints so we can return a clean 400 rather than a 500.
  if (merged.kickout_min_dollar! < merged.auto_reconcile_max_dollar!) {
    return NextResponse.json({ error: "kickout_dollar_below_auto" }, { status: 400 });
  }
  if (merged.kickout_min_percent! < merged.auto_reconcile_max_percent!) {
    return NextResponse.json({ error: "kickout_percent_below_auto" }, { status: 400 });
  }
  if (
    merged.auto_reconcile_max_percent! >= 1 ||
    merged.kickout_min_percent! >= 1 ||
    merged.auto_reconcile_max_percent! < 0 ||
    merged.kickout_min_percent! < 0
  ) {
    return NextResponse.json({ error: "percent_out_of_bounds" }, { status: 400 });
  }
  if (merged.auto_reconcile_max_dollar! < 0 || merged.kickout_min_dollar! < 0) {
    return NextResponse.json({ error: "dollar_negative" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_policies")
    .upsert(
      {
        engagement_id: engagementId,
        policy_mode: merged.policy_mode,
        auto_reconcile_max_dollar: merged.auto_reconcile_max_dollar,
        auto_reconcile_max_percent: merged.auto_reconcile_max_percent,
        kickout_min_dollar: merged.kickout_min_dollar,
        kickout_min_percent: merged.kickout_min_percent,
        authoritative_comparison: merged.authoritative_comparison,
        set_by_user_id: actor.userId,
        updated_by_user_id: actor.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "engagement_id" },
    )
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policy: data });
}
