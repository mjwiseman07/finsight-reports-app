import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  resolveSuperAdminAccess,
  auditSuperAdminEvent,
} from "@/lib/super-admin-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getERPAdapter } from "@/lib/erp-adapters";
import { DEMO_FIRMS } from "@/lib/demo/constants";
import {
  signHolderUserId,
  HOLDER_USER_ID_COOKIE_NAME,
} from "@/lib/demo/holder-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  holderUserId?: string;
  firmId?: string;
}

export async function POST(request: Request) {
  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
    email?: string;
  };
  if (access.response) return access.response;

  // Env preflight — fail loud before touching Intuit.
  const missingEnv = [
    "QB_CLIENT_ID",
    "QB_CLIENT_SECRET",
    "QB_REDIRECT_URI",
    "QB_ENVIRONMENT",
    "DEMO_OAUTH_SIGNING_KEY",
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    return NextResponse.json(
      { error: `Missing required env vars: ${missingEnv.join(", ")}` },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const holderUserId = body.holderUserId?.trim();
  const firmId = body.firmId?.trim();
  if (!holderUserId || !firmId) {
    return NextResponse.json(
      { error: "holderUserId and firmId are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // 1. Firm must be a demo firm (constants + DB is_demo).
  const demoFirm = DEMO_FIRMS.find((f) => f.firmId === firmId);
  if (!demoFirm) {
    return NextResponse.json(
      { error: "Firm is not a demo firm; refusing to attach connection" },
      { status: 403 },
    );
  }

  const { data: firm, error: firmErr } = await supabase
    .from("firms")
    .select("id, is_demo, name")
    .eq("id", firmId)
    .maybeSingle();
  if (firmErr || !firm) {
    return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  }
  if (!firm.is_demo) {
    return NextResponse.json(
      { error: "Firm is not a demo firm; refusing to attach connection" },
      { status: 403 },
    );
  }

  // 2. Holder must exist and be a sandbox holder.
  const { data: holderResp, error: holderErr } =
    await supabase.auth.admin.getUserById(holderUserId);
  if (holderErr || !holderResp?.user) {
    return NextResponse.json({ error: "Holder user not found" }, { status: 404 });
  }
  const isSandboxHolder = Boolean(
    (holderResp.user.app_metadata as Record<string, unknown> | null)?.[
      "is_demo_sandbox_holder"
    ],
  );
  if (!isSandboxHolder) {
    return NextResponse.json(
      { error: "User is not flagged as a demo sandbox holder" },
      { status: 403 },
    );
  }

  // 3. Holder must belong to THIS firm's pool.
  // DEMO-2 seeded holders as auth users with is_demo_sandbox_holder — they do
  // NOT have firm_memberships rows (only the super-admin does). Authoritative
  // pool check is DEMO_FIRMS holder emails, matching bind-holder.
  const holderEmailsForFirm = demoFirm.holders.map((h) => h.email);
  if (
    !holderResp.user.email ||
    !holderEmailsForFirm.includes(holderResp.user.email)
  ) {
    return NextResponse.json(
      { error: "Holder does not belong to this firm's demo pool" },
      { status: 403 },
    );
  }

  // 4. Build Intuit authorize URL.
  const state = crypto.randomUUID();
  const adapter = getERPAdapter("quickbooks", null);
  const { url } = adapter.connect({ state });

  // 5. Audit BEFORE returning the URL.
  try {
    await auditSuperAdminEvent({
      eventType: "connect_as_holder_start",
      actorUserId: access.userId ?? null,
      actorEmail: access.email ?? null,
      targetUserId: holderUserId,
      companyId: demoFirm.companyId,
      metadata: {
        firm_id: firmId,
        firm_name: firm.name,
        state_length: state.length,
      },
    });
  } catch (auditErr) {
    console.error("[connect-as-holder] audit write failed", {
      message: auditErr instanceof Error ? auditErr.message : String(auditErr),
    });
  }

  // 6. Cookies.
  let signedHolder: string;
  try {
    signedHolder = signHolderUserId(holderUserId);
  } catch (signErr) {
    return NextResponse.json(
      { error: signErr instanceof Error ? signErr.message : "Signing failed" },
      { status: 500 },
    );
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  };

  const response = NextResponse.json({ url });
  response.cookies.set("qb_oauth_state", state, cookieOptions);
  response.cookies.set("qb_oauth_mode", "super_admin_holder", cookieOptions);
  response.cookies.set(HOLDER_USER_ID_COOKIE_NAME, signedHolder, cookieOptions);
  response.cookies.set("qb_oauth_return_to", "/admin/demo-accounts", cookieOptions);
  return response;
}
