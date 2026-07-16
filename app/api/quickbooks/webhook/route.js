// app/api/quickbooks/webhook/route.js
//
// Issue #2 — Intuit QuickBooks webhook receiver.
//
// Contract with Intuit:
//   1. Verify HMAC-SHA256(raw_body, INTUIT_WEBHOOK_VERIFIER_TOKEN) === base64(intuit-signature)
//   2. Respond 200 fast (< 3s) — persist raw event, dispatch async, never block on API refetch
//   3. Parse CloudEvents format (Intuit's mandatory format as of July 31, 2026)
//   4. Handle multi-realm batches (one HTTP request can carry events for many companies)
//   5. Dedup on CloudEvents `id`
//
// Rejection contract:
//   - Missing/invalid signature       -> 401 (do NOT persist)
//   - Missing verifier token env var  -> 500 (fail loud in logs, Intuit will retry)
//   - Missing supabase admin client   -> 500 (fail loud in logs, Intuit will retry)
//   - Malformed JSON                  -> 400 (persist raw body under a "malformed" marker
//                                             so we can forensically inspect)
//   - Handler dispatch error          -> 200 still (event is persisted, handler will be
//                                             replayed by a reconciliation job)
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabase";
import { dispatchWebhookEvent } from "../../../../lib/qbo/webhook-handlers";

// Force Node runtime — we need `crypto`, and raw body preservation is unreliable on Edge.
export const runtime = "nodejs";
// No cache; every POST is unique.
export const dynamic = "force-dynamic";

// =========================================================================
// GET — Intuit dev-portal reachability check.
// Intuit's dashboard pings the endpoint URL on save. Return 200 with a
// minimal body so the save button doesn't complain.
// =========================================================================
export async function GET() {
  return NextResponse.json(
    { ok: true, endpoint: "quickbooks-webhook", method: "GET" },
    { status: 200 },
  );
}

// =========================================================================
// POST — the real receiver.
// =========================================================================
export async function POST(request) {
  // ----- 1. Read raw body BEFORE parsing (signature is computed over exact bytes)
  let rawBody;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("[qbo-webhook] failed to read request body", err);
    return new NextResponse("Bad Request", { status: 400 });
  }

  // ----- 2. Extract signature header
  const signatureHeader = request.headers.get("intuit-signature");
  if (!signatureHeader) {
    console.warn("[qbo-webhook] missing intuit-signature header");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ----- 3. Load verifier token (server-side only; never referenced client-side)
  const verifierToken = process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN;
  if (!verifierToken) {
    console.error(
      "[qbo-webhook] INTUIT_WEBHOOK_VERIFIER_TOKEN not set — cannot verify signature",
    );
    // 500 → Intuit will retry with backoff, giving us time to add the env var
    return new NextResponse("Server misconfiguration", { status: 500 });
  }

  // ----- 3b. Guard: supabaseAdmin can be null if SUPABASE_SERVICE_ROLE_KEY is missing.
  // In production it must be set; if it isn't, fail loud so Intuit retries.
  if (!supabaseAdmin) {
    console.error(
      "[qbo-webhook] supabaseAdmin is null — SUPABASE_SERVICE_ROLE_KEY likely missing",
    );
    return new NextResponse("Server misconfiguration", { status: 500 });
  }

  // ----- 4. Verify HMAC-SHA256, constant-time compare (base64 encoding)
  const expected = crypto
    .createHmac("sha256", verifierToken)
    .update(rawBody, "utf8")
    .digest("base64");

  // Both strings must be equal length before timingSafeEqual; otherwise the
  // comparison itself would leak length info.
  const sigBuf = Buffer.from(signatureHeader, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    console.warn("[qbo-webhook] signature mismatch");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ----- 5. Parse CloudEvents JSON (top-level ARRAY, one entry per event)
  let events;
  try {
    events = JSON.parse(rawBody);
  } catch (err) {
    console.error("[qbo-webhook] malformed JSON body", err);
    // Persist the malformed body once for forensics, then 400.
    try {
      await supabaseAdmin.from("qbo_webhook_events").insert({
        cloud_event_id: `malformed-${Date.now()}-${crypto.randomUUID()}`,
        spec_version: "unknown",
        event_type: "malformed",
        event_time: new Date().toISOString(),
        intuit_entity_id: "unknown",
        intuit_account_id: "unknown",
        entity_name: "malformed",
        operation: "malformed",
        data_payload: null,
        raw_body: rawBody,
        intuit_signature: signatureHeader,
        processed_at: new Date().toISOString(),
        processed_status: "error",
        processed_error: `JSON parse failed: ${err?.message || String(err)}`,
        fetch_pending: false,
      });
    } catch (insertErr) {
      console.error(
        "[qbo-webhook] failed to persist malformed body for forensics",
        insertErr,
      );
    }
    return new NextResponse("Bad Request", { status: 400 });
  }

  // CloudEvents from Intuit is always a top-level array. Defensive: also
  // accept a single object (some legacy transports wrap it that way).
  const eventArray = Array.isArray(events) ? events : [events];

  if (eventArray.length === 0) {
    // Empty array is technically valid (Intuit could send an empty
    // heartbeat); log and ack.
    console.log("[qbo-webhook] empty event array — acking");
    return NextResponse.json({ ok: true, received: 0 }, { status: 200 });
  }

  // ----- 6. Persist every event BEFORE any downstream dispatch.
  // If persistence fails we return 500 → Intuit retries → no data loss.
  const persistedRows = [];
  for (const evt of eventArray) {
    const { entityName, operation } = parseCloudEventType(evt?.type);
    const row = {
      cloud_event_id: String(evt?.id || `unknown-${crypto.randomUUID()}`),
      spec_version: String(evt?.specversion || "unknown"),
      source: evt?.source ? String(evt.source) : null,
      event_type: String(evt?.type || "unknown"),
      event_time: normalizeTimestamp(evt?.time),
      intuit_entity_id: String(evt?.intuitentityid || "unknown"),
      intuit_account_id: String(evt?.intuitaccountid || "unknown"),
      entity_name: entityName,
      operation: operation,
      data_payload: evt?.data ?? null,
      raw_body: rawBody, // full envelope for every row — enables replay of the whole batch
      intuit_signature: signatureHeader,
      fetch_pending: true,
    };

    // Upsert on cloud_event_id — if Intuit retries the same event id,
    // we no-op instead of erroring out.
    const { data, error } = await supabaseAdmin
      .from("qbo_webhook_events")
      .upsert(row, { onConflict: "cloud_event_id", ignoreDuplicates: true })
      .select(
        "id, cloud_event_id, entity_name, operation, intuit_account_id, intuit_entity_id, data_payload",
      )
      .maybeSingle();

    if (error) {
      console.error("[qbo-webhook] persistence error", {
        cloud_event_id: row.cloud_event_id,
        error: error.message,
      });
      // Do NOT continue — return 500 so Intuit retries the whole batch.
      return new NextResponse("Persistence failed", { status: 500 });
    }

    if (data) {
      persistedRows.push(data);
    }
    // If data is null, the row was a duplicate (ignored) — skip dispatch.
  }

  // ----- 7. Async dispatch — do NOT await. Handlers self-update processed_at.
  // We swallow errors here; the row remains in qbo_webhook_events with
  // processed_at = NULL and a reconciliation job will replay.
  //
  // NOTE: On Vercel serverless, background work after response can be
  // truncated. For NOW (Intuit App Store submission), we accept that the
  // reconciliation job (Issue #4 CDC cron) will pick up any orphaned
  // fetch_pending rows within the hour. This is Intuit-compliant because
  // the event IS persisted before the 200 goes out.
  for (const row of persistedRows) {
    // Fire and forget. Any handler failures are logged inside the handler
    // and stored on the row via processed_status = 'error'.
    dispatchWebhookEvent(row).catch((err) => {
      console.error("[qbo-webhook] dispatch error", {
        cloud_event_id: row.cloud_event_id,
        error: err?.message || String(err),
      });
    });
  }

  // ----- 8. 200 fast.
  return NextResponse.json(
    { ok: true, received: eventArray.length, persisted: persistedRows.length },
    { status: 200 },
  );
}

// =========================================================================
// Helpers
// =========================================================================

/**
 * Parse a CloudEvents `type` string like "qbo.invoice.updated.v1" into
 * { entityName, operation }.
 *
 * Format: namespace.entitytype.eventname.version
 *   e.g. qbo.account.created.v1        -> { entityName: "account", operation: "created" }
 *        qbo.customer.merged.v1        -> { entityName: "customer", operation: "merged" }
 *        qbo.salesreceipt.updated.v1   -> { entityName: "salesreceipt", operation: "updated" }
 */
function parseCloudEventType(type) {
  if (!type || typeof type !== "string") {
    return { entityName: "unknown", operation: "unknown" };
  }
  const parts = type.split(".");
  // Expect at least [namespace, entity, event, version]
  if (parts.length < 3) {
    return { entityName: "unknown", operation: "unknown" };
  }
  const entityName = parts[1]?.toLowerCase() || "unknown";
  const operation = parts[2]?.toLowerCase() || "unknown";
  return { entityName, operation };
}

/**
 * Coerce Intuit's `time` (RFC 3339) into a JS ISO string. If missing or
 * malformed, fall back to now — we want the row to persist for forensics.
 */
function normalizeTimestamp(raw) {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}
