import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromRequest } from "@/lib/mfa/server";
import { createServiceClient } from "@/lib/supabase/service";
import { issuePurgeToken } from "@/lib/gap2/purge-tokens";
import { verifyMfaStepUpForRequest } from "@/lib/pre-close/mfa-step-up-verify";
import { sendCustomerPurgeConfirmEmail } from "@/lib/gap2/notifications";
import {
  mfaVerifiedCookieName,
  verifyMfaVerifiedCookie,
} from "@/lib/mfa/trusted-devices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Prefer Gap 3 step-up helper; fall back to raw cookie for non-cookie() callers.
  const stepUp = await verifyMfaStepUpForRequest(user.id);
  if (!stepUp.ok) {
    const cookieStore = await cookies();
    const raw = cookieStore.get(mfaVerifiedCookieName())?.value;
    const ok = await verifyMfaVerifiedCookie(raw, user.id);
    if (!ok) {
      return NextResponse.json({ error: "mfa_step_up_required" }, { status: 403 });
    }
  }

  const admin = createServiceClient();
  const { data: firm } = await admin
    .from("firms")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!firm) {
    return NextResponse.json({ error: "not_firm_owner" }, { status: 403 });
  }

  const token = await issuePurgeToken(firm.id as string, user.id);
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "https://www.advisacor.com";
  const confirmUrl = `${base.replace(/\/$/, "")}/api/account/confirm-data-purge?token=${token}`;

  if (!user.email) {
    return NextResponse.json({ error: "no_email" }, { status: 400 });
  }

  await sendCustomerPurgeConfirmEmail(user.email, confirmUrl);
  return NextResponse.json({ ok: true });
}
