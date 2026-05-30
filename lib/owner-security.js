import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase";

const OWNER_ROLE = "owner";
const ALLOWED_OWNER_ROLES = new Set([OWNER_ROLE, "admin"]);

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getMagicLinkSecret() {
  return process.env.OWNER_MAGIC_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function createOwnerMagicLinkToken(payload) {
  const secret = getMagicLinkSecret();
  if (!secret) throw new Error("Owner magic link secret is not configured.");

  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      ...payload,
      role: OWNER_ROLE,
      exp: payload.exp || Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  );
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyOwnerMagicLinkToken(token, briefId) {
  const secret = getMagicLinkSecret();
  if (!secret || !token || !token.includes(".")) return null;

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  if (signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.role !== OWNER_ROLE) return null;
  if (payload.briefId !== briefId) return null;
  if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;

  return payload;
}

export async function auditOwnerEvent({ eventType, briefId, companyId, ownerUserId, metadata = {} }) {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from("audit_logs")
    .insert({
      event_type: eventType,
      actor_user_id: ownerUserId || null,
      company_id: companyId || null,
      resource_type: "owner_brief",
      resource_id: briefId,
      metadata,
      created_at: new Date().toISOString(),
    })
    .throwOnError()
    .catch(() => {
      // Audit table may not exist yet in pre-launch environments.
    });
}

export async function resolveOwnerBriefAccess(request, briefId) {
  if (!supabaseAdmin) {
    return {
      response: NextResponse.json({ error: "Supabase is not configured for secure owner access." }, { status: 503 }),
    };
  }

  const url = new URL(request.url);
  const magicToken = url.searchParams.get("token") || request.headers.get("x-owner-magic-token") || "";
  const magicPayload = verifyOwnerMagicLinkToken(magicToken, briefId);
  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  let authUserId = "";
  let authMode = "";

  if (bearerToken) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);
    if (authError || !authData?.user?.id) {
      return { response: NextResponse.json({ error: "Invalid or expired session." }, { status: 401 }) };
    }
    authUserId = authData.user.id;
    authMode = "session";
  } else if (magicPayload) {
    authUserId = magicPayload.ownerUserId;
    authMode = "magic-link";
  } else {
    return {
      response: NextResponse.json(
        { error: "Authenticated session or valid owner magic link is required." },
        { status: 401 },
      ),
    };
  }

  const { data: brief, error: briefError } = await supabaseAdmin
    .from("owner_briefs")
    .select(
      "id, company_id, owner_user_id, package_level, report_type, period_label, status, owner_summary, report_context, pdf_storage_path, ppt_storage_path, expires_at",
    )
    .eq("id", briefId)
    .maybeSingle();

  if (briefError) {
    return {
      response: NextResponse.json(
        {
          error:
            briefError.code === "42P01"
              ? "Owner brief storage is not configured yet."
              : "Unable to load secure owner brief.",
        },
        { status: briefError.code === "42P01" ? 501 : 500 },
      ),
    };
  }

  if (!brief) {
    return { response: NextResponse.json({ error: "Owner brief not found." }, { status: 404 }) };
  }

  if (brief.expires_at && new Date(brief.expires_at).getTime() <= Date.now()) {
    return { response: NextResponse.json({ error: "This secure owner link has expired." }, { status: 410 }) };
  }

  if (magicPayload) {
    if (magicPayload.ownerUserId !== brief.owner_user_id || magicPayload.companyId !== brief.company_id) {
      return { response: NextResponse.json({ error: "Owner link is not authorized for this report." }, { status: 403 }) };
    }
  } else if (authUserId !== brief.owner_user_id) {
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_users")
      .select("role")
      .eq("company_id", brief.company_id)
      .eq("user_id", authUserId)
      .maybeSingle();

    if (membershipError?.code === "42P01") {
      return {
        response: NextResponse.json(
          { error: "Owner role validation is not configured yet." },
          { status: 501 },
        ),
      };
    }

    if (!membership || !ALLOWED_OWNER_ROLES.has(membership.role)) {
      return { response: NextResponse.json({ error: "Owner role is required for this report." }, { status: 403 }) };
    }
  }

  return {
    authMode,
    ownerUserId: authUserId,
    brief,
    magicPayload,
  };
}
