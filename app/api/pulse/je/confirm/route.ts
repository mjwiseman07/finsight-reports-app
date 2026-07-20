import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { auditSecurityEvent } from "@/lib/security-audit.js";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { ADVISACOR_ACCESS_TOKEN_COOKIE } from "@/lib/reviewer/constants";
import {
  readImpersonationCookieFromRequest,
} from "@/lib/demo/impersonation";
import { requirePulseJeEntitlement } from "@/lib/pulse-je/entitlement";
import { buildJeCompositionFromPreview } from "@/lib/pulse-je/composition-builder";
import { computePulseJeIdempotencyKey } from "@/lib/pulse-je/idempotency";
import { validateJeComposition } from "@/lib/je-evidence/contract";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";
import type { JePreviewPayload } from "@/lib/pulse-je/types";
import type { JEPayload, JEPostRequest } from "@/lib/erp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAccessTokenCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADVISACOR_ACCESS_TOKEN_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function extractAccessToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  let token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    token = parseAccessTokenCookie(request.headers.get("cookie")) || "";
  }
  return token;
}

function isJePreviewPayload(obj: unknown): obj is JePreviewPayload {
  if (!obj || typeof obj !== "object") return false;
  const preview = obj as Record<string, unknown>;
  const meta = preview.meta as Record<string, unknown> | undefined;
  return (
    Boolean(preview.intent_signal) &&
    Array.isArray(preview.lines) &&
    preview.lines.length === 2 &&
    Boolean(meta) &&
    typeof meta?.firm_client_id === "string"
  );
}

async function userMayConfirmFirmClient(params: {
  request: Request;
  userId: string;
  firmId: string;
  companyId: string | null;
  ownerUserId: string | null;
}): Promise<boolean> {
  const { request, userId, firmId, companyId, ownerUserId } = params;
  if (ownerUserId && ownerUserId === userId) return true;

  const supabase = getSupabaseAdmin();

  const { data: firmMembership } = await supabase
    .from("firm_memberships")
    .select("firm_id")
    .eq("firm_id", firmId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (firmMembership?.firm_id) return true;

  if (companyId) {
    const { data: companyMembership } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (companyMembership?.company_id) return true;
  }

  const impersonatedFirmId = readImpersonationCookieFromRequest(request);
  if (impersonatedFirmId && impersonatedFirmId === firmId) return true;

  const access = (await resolveSuperAdminAccess(request)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (!access.response && access.userId) return true;

  return false;
}

export async function POST(request: Request) {
  const token = extractAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const preview = (body as { preview?: unknown } | null)?.preview;
  if (!isJePreviewPayload(preview)) {
    return NextResponse.json({ error: "bad_preview" }, { status: 400 });
  }

  const { data: firmClient, error: firmClientError } = await supabase
    .from("firm_clients")
    .select("id, firm_id, company_id, owner_user_id")
    .eq("id", preview.meta.firm_client_id)
    .maybeSingle();

  if (firmClientError || !firmClient?.id || !firmClient.firm_id) {
    return NextResponse.json({ error: "firm_client_not_found" }, { status: 404 });
  }

  const firmId = firmClient.firm_id as string;
  const companyId = (firmClient.company_id as string | null) || preview.meta.company_id || null;
  const ownerUserId = (firmClient.owner_user_id as string | null) || null;

  const gate = await requirePulseJeEntitlement(firmId);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "forbidden", message: gate.reason || "RA Pro required" },
      { status: 403 },
    );
  }

  const allowed = await userMayConfirmFirmClient({
    request,
    userId: user.id,
    firmId,
    companyId,
    ownerUserId,
  });
  if (!allowed) {
    await auditSecurityEvent({
      eventType: "pulse_je_confirm_forbidden_cross_firm",
      actorUserId: user.id,
      metadata: {
        firm_id: firmId,
        company_id: companyId,
        preview_firm_client_id: preview.meta.firm_client_id,
        preview_company_id: preview.meta.company_id,
      },
    });
    return NextResponse.json({ error: "forbidden_cross_firm" }, { status: 403 });
  }

  if (preview.validation.status === "error") {
    return NextResponse.json(
      { error: "preview_validation_error", messages: preview.validation.messages },
      { status: 400 },
    );
  }

  if (!preview.balance_check.balanced) {
    return NextResponse.json({ error: "unbalanced" }, { status: 400 });
  }

  const composition = buildJeCompositionFromPreview(preview, user.id);
  try {
    validateJeComposition(composition);
  } catch (err: unknown) {
    const message = String((err as { message?: string })?.message || err);
    await auditSecurityEvent({
      eventType: "pulse_je_confirm_composition_invalid",
      actorUserId: user.id,
      metadata: {
        message,
        firm_id: firmId,
        company_id: companyId,
        firm_client_id: preview.meta.firm_client_id,
      },
    });
    return NextResponse.json({ error: "composition_invalid", message }, { status: 400 });
  }

  const payload: JEPayload = {
    transaction_date: preview.txn_date_iso,
    narration: preview.memo,
    private_note: `Pulse conversational JE. Confidence ${preview.intent_signal.confidence.toFixed(2)}.`,
    currency: preview.currency_code,
    lines: preview.lines.map((l) => ({
      account_id: l.account_qbo_id,
      amount: l.amount,
      posting_type: l.side,
      description: preview.memo,
    })),
  };

  const idempotencyKey = computePulseJeIdempotencyKey(preview, user.id);
  const req: JEPostRequest = {
    firm_client_id: preview.meta.firm_client_id,
    idempotency_key: idempotencyKey,
    source_type: "manual",
    posted_by: "human",
    posted_by_user_id: user.id,
    payload,
    composition,
    assertions_addressed: [],
    data_source_reliability_basis: "user_conversational_correction",
  };

  let result;
  try {
    result = await qboJournalEntryPoster.post(req);
  } catch (err: unknown) {
    const message = String((err as { message?: string })?.message || err);
    await auditSecurityEvent({
      eventType: "pulse_je_confirm_poster_threw",
      actorUserId: user.id,
      metadata: {
        message,
        firm_id: firmId,
        company_id: companyId,
        firm_client_id: preview.meta.firm_client_id,
      },
    });
    return NextResponse.json({ error: "poster_error", message }, { status: 500 });
  }

  await auditSecurityEvent({
    eventType: "pulse_je_confirm_completed",
    actorUserId: user.id,
    metadata: {
      firm_id: firmId,
      company_id: companyId,
      firm_client_id: preview.meta.firm_client_id,
      status: result.status,
      attempt_id: "attempt_id" in result ? result.attempt_id : null,
      qbo_je_id: "qbo_je_id" in result ? result.qbo_je_id : null,
      idempotency_key: idempotencyKey,
      confidence: preview.intent_signal.confidence,
      raw_text: preview.intent_signal.raw_text,
    },
  });

  return NextResponse.json(result, { status: 200 });
}
