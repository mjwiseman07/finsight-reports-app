import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

/**
 * Phase TCP1 W3 — QuickBooks disconnect route.
 *
 * Entry points:
 *   - GET  (browser navigation): redirect to /dashboard?qbDisconnect=pending
 *   - POST + Bearer token (user-confirmed disconnect via UI): mark user's
 *     active connections disconnected. Matches xero/disconnect pattern.
 *   - POST + intuit-signature header (Intuit webhook, HMAC-signed): mark
 *     connections for the notified realmId(s) disconnected. Idempotent.
 *
 * Intuit requires this URL to be reachable at /api/quickbooks/disconnect
 * as part of App Assessment.
 */

// ----- Helpers -----

function timingSafeEqualString(a, b) {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verify Intuit's HMAC-SHA256 signature on webhook request bodies.
 * Header: `intuit-signature` (base64-encoded HMAC-SHA256 of raw body
 * using the app's verifier token as the key).
 */
function verifyIntuitSignature(rawBody, signatureHeader) {
  const verifierToken = process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) {
    console.warn("[quickbooks/disconnect] INTUIT_WEBHOOK_VERIFIER_TOKEN not configured");
    return false;
  }
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", verifierToken)
    .update(rawBody, "utf8")
    .digest("base64");

  return timingSafeEqualString(expected, signatureHeader);
}

async function markConnectionsDisconnectedByRealmId(realmId) {
  if (!supabaseAdmin || !realmId) return { erp_updated: 0, accounting_updated: 0 };
  const now = new Date().toISOString();
  let erpUpdated = 0;
  let accountingUpdated = 0;

  // erp_connections: paid users
  try {
    const { data, error } = await supabaseAdmin
      .from("erp_connections")
      .update({ disconnected_at: now, updated_at: now })
      .eq("realm_id", realmId)
      .eq("platform", "quickbooks")
      .is("disconnected_at", null)
      .select("id");

    if (error) {
      if (/erp_connections.*does not exist/i.test(error.message || "")) {
        console.warn("[quickbooks/disconnect] erp_connections missing; skipping");
      } else {
        throw error;
      }
    } else {
      erpUpdated = Array.isArray(data) ? data.length : 0;
    }
  } catch (err) {
    console.error("[quickbooks/disconnect] erp_connections update by realm failed", err);
  }

  // accounting_connections: lead / free-review flow
  try {
    const { data, error } = await supabaseAdmin
      .from("accounting_connections")
      .update({ status: "disconnected", updated_at: now })
      .eq("tenant_or_realm_id", realmId)
      .neq("status", "disconnected")
      .select("id");

    if (error) {
      if (/accounting_connections.*does not exist/i.test(error.message || "")) {
        console.warn("[quickbooks/disconnect] accounting_connections missing; skipping");
      } else {
        throw error;
      }
    } else {
      accountingUpdated = Array.isArray(data) ? data.length : 0;
    }
  } catch (err) {
    console.error("[quickbooks/disconnect] accounting_connections update by realm failed", err);
  }

  return { erp_updated: erpUpdated, accounting_updated: accountingUpdated };
}

async function markConnectionsDisconnectedByUserId(userId) {
  if (!supabaseAdmin || !userId) return { erp_updated: 0, accounting_updated: 0 };
  const now = new Date().toISOString();
  let erpUpdated = 0;
  let accountingUpdated = 0;

  try {
    const { data, error } = await supabaseAdmin
      .from("erp_connections")
      .update({ disconnected_at: now, updated_at: now })
      .eq("user_id", userId)
      .eq("platform", "quickbooks")
      .is("disconnected_at", null)
      .select("id");

    if (error && !/does not exist/i.test(error.message || "")) throw error;
    erpUpdated = Array.isArray(data) ? data.length : 0;
  } catch (err) {
    console.error("[quickbooks/disconnect] erp_connections update by user failed", err);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("accounting_connections")
      .update({ status: "disconnected", updated_at: now })
      .eq("user_id", userId)
      .eq("provider", "quickbooks")
      .neq("status", "disconnected")
      .select("id");

    if (error && !/does not exist/i.test(error.message || "")) throw error;
    accountingUpdated = Array.isArray(data) ? data.length : 0;
  } catch (err) {
    console.error("[quickbooks/disconnect] accounting_connections update by user failed", err);
  }

  return { erp_updated: erpUpdated, accounting_updated: accountingUpdated };
}

function extractRealmIds(payload) {
  const realmIds = new Set();
  if (Array.isArray(payload?.eventNotifications)) {
    for (const evt of payload.eventNotifications) {
      if (evt?.realmId) realmIds.add(String(evt.realmId));
    }
  }
  if (payload?.realmId) realmIds.add(String(payload.realmId));
  if (payload?.realm_id) realmIds.add(String(payload.realm_id));
  return realmIds;
}

// ----- GET: browser landing page (Intuit "Disconnect" link redirect target) -----

export async function GET(request) {
  const url = new URL(request.url);
  const dashboardUrl = new URL("/dashboard", url);
  dashboardUrl.searchParams.set("qbDisconnect", "pending");
  return NextResponse.redirect(dashboardUrl, 307);
}

// ----- POST: dual-mode (Bearer for UI, Intuit signature for webhook) -----

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "quickbooks-disconnect", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  // Read raw body once — need it for both signature verification and JSON parsing.
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("[quickbooks/disconnect] failed to read body", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const authorization = request.headers.get("authorization") || "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const intuitSignature = request.headers.get("intuit-signature") || request.headers.get("Intuit-Signature");

  // -------- Mode A: user-confirmed disconnect from Advisacor UI --------
  if (bearerToken) {
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);
      if (authError || !authData?.user?.id) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }

      const result = await markConnectionsDisconnectedByUserId(authData.user.id);
      console.log("[quickbooks/disconnect] user-initiated disconnect", {
        user_id: authData.user.id,
        ...result,
      });

      return NextResponse.json({ ok: true, provider: "quickbooks", ...result }, { status: 200 });
    } catch (err) {
      console.error("[quickbooks/disconnect] user-mode failed", err);
      return NextResponse.json({ error: "Unable to disconnect QuickBooks" }, { status: 500 });
    }
  }

  // -------- Mode B: Intuit webhook (server-to-server, HMAC-signed) --------
  if (!verifyIntuitSignature(rawBody, intuitSignature)) {
    console.warn("[quickbooks/disconnect] no Bearer and invalid/missing intuit-signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (err) {
    console.error("[quickbooks/disconnect] webhook payload not JSON", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const realmIds = extractRealmIds(payload);
  if (realmIds.size === 0) {
    console.log("[quickbooks/disconnect] webhook accepted with no realmId (no-op)");
    return NextResponse.json({ ok: true, erp_updated: 0, accounting_updated: 0 }, { status: 200 });
  }

  let totalErp = 0;
  let totalAccounting = 0;
  for (const realmId of realmIds) {
    const result = await markConnectionsDisconnectedByRealmId(realmId);
    totalErp += result.erp_updated;
    totalAccounting += result.accounting_updated;
    console.log("[quickbooks/disconnect] webhook processed", {
      realm_id: realmId,
      ...result,
    });
  }

  return NextResponse.json(
    { ok: true, erp_updated: totalErp, accounting_updated: totalAccounting },
    { status: 200 },
  );
}
