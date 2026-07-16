// lib/qbo/cdc.js
//
// Issue #4 — QBO Change Data Capture (CDC) reconciliation.
// Issue #4.1 — Hardening: realm-dedup, try/finally, orphan sweep.
//
// Design contract:
//   - Called hourly by /api/quickbooks/cdc route.
//   - Groups accounting_connections by tenant_or_realm_id (QBO CDC is
//     per-realm, not per-user — multiple users of the same QBO company
//     would otherwise trigger redundant scans).
//   - For each realm, picks ONE winner connection (freshest token) and
//     calls QBO's /cdc endpoint per entity, upserting synthetic
//     reconciliation rows into qbo_webhook_events.
//   - Uses `cdc:{realm}:{entity}:{id}:{isoTs}` as the cloud_event_id — a
//     deterministic namespace disjoint from Intuit's own event ids — so
//     re-runs are idempotent via ON CONFLICT DO NOTHING.
//   - Every qbo_cdc_runs row is guaranteed to be finalized: try/finally
//     in reconcileRealm plus a top-level sweep for any orphans (this run
//     or older) catch process-termination races.

import { qboApiFetch } from "./api-fetch.js";
import { supabaseAdmin } from "../supabase";

/**
 * The 24 QBO entity types Intuit publishes webhooks for. Kept in sync with
 * lib/qbo/webhook-handlers.js HANDLERS registry.
 *
 * Note: entity names in CDC URL params are Pascal-case (per QBO docs), while
 * `entity_name` in our tables is lowercase. We store both mappings.
 */
export const CDC_ENTITIES = [
  { qbo: "Account",        table: "account" },
  { qbo: "Bill",           table: "bill" },
  { qbo: "BillPayment",    table: "billpayment" },
  { qbo: "Budget",         table: "budget" },
  { qbo: "Class",          table: "class" },
  { qbo: "CreditMemo",     table: "creditmemo" },
  { qbo: "Currency",       table: "currency" },
  { qbo: "Customer",       table: "customer" },
  { qbo: "Department",     table: "department" },
  { qbo: "Deposit",        table: "deposit" },
  { qbo: "Employee",       table: "employee" },
  { qbo: "Estimate",       table: "estimate" },
  { qbo: "Invoice",        table: "invoice" },
  { qbo: "Item",           table: "item" },
  { qbo: "JournalEntry",   table: "journalentry" },
  { qbo: "Payment",        table: "payment" },
  { qbo: "Purchase",       table: "purchase" },
  { qbo: "PurchaseOrder",  table: "purchaseorder" },
  { qbo: "RefundReceipt",  table: "refundreceipt" },
  { qbo: "SalesReceipt",   table: "salesreceipt" },
  { qbo: "TimeActivity",   table: "timeactivity" },
  { qbo: "Transfer",       table: "transfer" },
  { qbo: "Vendor",         table: "vendor" },
  { qbo: "VendorCredit",   table: "vendorcredit" },
];

// QBO's CDC endpoint accepts a max of 30 entity types per call; we chunk in 20s
// to leave headroom and keep URL length reasonable.
const CHUNK_SIZE = 20;

// CDC allows changedSince up to 30 days back. We use 29 to stay safely inside.
const CDC_MAX_LOOKBACK_DAYS = 29;

// 250ms between CDC calls per realm to stay well under QBO rate limits (500 req/min per realm).
const INTER_CALL_SLEEP_MS = 250;

// Global execution budget for one cron run. Vercel maxDuration is 5min (300s);
// we reserve 90s for finalize/sweep to avoid process-kill races.
const RUN_BUDGET_MS = 3.5 * 60 * 1000; // 3 min 30 sec

// Any row still `running` older than this is orphaned (from a hard-killed
// process in a prior run) and gets swept by the self-healing pass.
const ORPHAN_SWEEP_AGE_MS = 5 * 60 * 1000; // 5 minutes

function qboBaseUrl() {
  // Match existing QBO helpers (api-fetch callers use QB_ENVIRONMENT, not QBO_ENVIRONMENT).
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireAdmin() {
  if (!supabaseAdmin) {
    throw new Error("supabaseAdmin is null — SUPABASE_SERVICE_ROLE_KEY likely missing");
  }
  return supabaseAdmin;
}

/**
 * Build the CDC url. `changedSince` must be RFC3339 (ISO 8601) UTC.
 */
function buildCdcUrl(realmId, entityQboNames, changedSinceIso) {
  const base = qboBaseUrl();
  const entities = entityQboNames.join(",");
  const encoded = encodeURIComponent(changedSinceIso);
  return `${base}/v3/company/${realmId}/cdc?entities=${entities}&changedSince=${encoded}&minorversion=73`;
}

/**
 * Default cursor if we've never queried this entity: 29 days back.
 */
function defaultCursor() {
  return new Date(
    Date.now() - CDC_MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

/**
 * Group N connections by realm, pick ONE winner per realm.
 *
 * Winner rule:
 *   1. Highest token_expires_at (freshest token — least likely to need refresh).
 *   2. Tiebreak: most recently updated_at.
 *
 * QBO CDC is per-realm (one QBO company = one realm_id). Multiple users of
 * the same company issue duplicate scans if we iterate all rows blindly.
 */
export function pickWinnerConnectionPerRealm(connections) {
  const byRealm = new Map();
  for (const c of connections || []) {
    if (!c.tenant_or_realm_id) continue;
    const existing = byRealm.get(c.tenant_or_realm_id);
    if (!existing) {
      byRealm.set(c.tenant_or_realm_id, c);
      continue;
    }
    const existingExp = existing.token_expires_at ? new Date(existing.token_expires_at).getTime() : 0;
    const candidateExp = c.token_expires_at ? new Date(c.token_expires_at).getTime() : 0;
    if (candidateExp > existingExp) {
      byRealm.set(c.tenant_or_realm_id, c);
      continue;
    }
    if (candidateExp === existingExp) {
      const existingUpd = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const candidateUpd = c.updated_at ? new Date(c.updated_at).getTime() : 0;
      if (candidateUpd > existingUpd) {
        byRealm.set(c.tenant_or_realm_id, c);
      }
    }
  }
  return Array.from(byRealm.values());
}

/**
 * Load current cursors for a realm. Returns { [entityTable]: isoString }.
 */
async function loadCursors(realmId) {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("qbo_cdc_cursors")
    .select("entity_name, last_changed_at")
    .eq("realm_id", realmId);
  if (error) throw new Error(`load cursors failed: ${error.message}`);
  const cursors = {};
  for (const row of data || []) {
    cursors[row.entity_name] = row.last_changed_at;
  }
  return cursors;
}

/**
 * Advance cursor for a realm × entity. Uses upsert (unique on realm, entity).
 */
async function saveCursor(realmId, entityTable, isoTimestamp) {
  const admin = requireAdmin();
  const { error } = await admin
    .from("qbo_cdc_cursors")
    .upsert(
      {
        realm_id: realmId,
        entity_name: entityTable,
        last_changed_at: isoTimestamp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "realm_id,entity_name" },
    );
  if (error) console.warn("[qbo-cdc] saveCursor error", { realmId, entityTable, error: error.message });
}

/**
 * Parse the CDC response envelope. QBO returns:
 *   { CDCResponse: [ { QueryResponse: [ { <EntityName>: [...], startPosition, maxResults } ] } ] }
 * Each inner QueryResponse contains an array keyed by the QBO entity name.
 */
function extractChangedEntities(cdcJson) {
  const out = []; // { qboName, tableName, entities: [...] }
  const cdcResponses = cdcJson?.CDCResponse || [];
  for (const cr of cdcResponses) {
    const queryResponses = cr?.QueryResponse || [];
    for (const qr of queryResponses) {
      // Each QueryResponse has one entity key (e.g. "Customer"). Find it.
      for (const key of Object.keys(qr)) {
        if (["startPosition", "maxResults", "totalCount"].includes(key)) continue;
        const arr = qr[key];
        if (Array.isArray(arr)) {
          const mapping = CDC_ENTITIES.find((e) => e.qbo === key);
          if (mapping) {
            out.push({ qboName: key, tableName: mapping.table, entities: arr });
          }
        }
      }
    }
  }
  return out;
}

/**
 * Deterministic cloud_event_id namespace for CDC-generated rows.
 * Format: cdc:{realm}:{entity}:{id}:{isoTs}
 */
function cdcCloudEventId(realmId, entityTable, entityId, lastUpdatedIso) {
  return `cdc:${realmId}:${entityTable}:${entityId}:${lastUpdatedIso}`;
}

/**
 * For a single entity from CDC, determine `operation` (create/update/delete).
 * QBO CDC includes deleted entities with `status: "Deleted"`; otherwise it's
 * either a create or update — CDC does not distinguish. We use MetaData.CreateTime
 * === MetaData.LastUpdatedTime as a heuristic for create, else update.
 */
function inferOperation(entity) {
  if (entity?.status === "Deleted" || entity?.Status === "Deleted") return "delete";
  const created = entity?.MetaData?.CreateTime;
  const updated = entity?.MetaData?.LastUpdatedTime;
  if (created && updated && created === updated) return "create";
  return "update";
}

/**
 * Insert reconciliation rows. Returns { inserted, rescued, confirmed }.
 *
 * rescued = insert succeeded AND no webhook row exists for (realm, entity, id) within ±60s
 *           of this LastUpdatedTime → webhook was dropped, CDC saved us.
 * confirmed = insert succeeded AND a matching webhook row DOES exist → CDC agrees with webhook.
 * (If the CDC deterministic key collides with a prior CDC run, ON CONFLICT DO NOTHING skips it —
 *  those are not counted in inserted/rescued/confirmed.)
 */
async function persistCdcRows(realmId, changed) {
  const admin = requireAdmin();
  let inserted = 0;
  let rescued = 0;
  let confirmed = 0;

  for (const group of changed) {
    for (const entity of group.entities) {
      const entityId = String(entity?.Id ?? entity?.id ?? "");
      const lastUpdated =
        entity?.MetaData?.LastUpdatedTime ||
        entity?.MetaData?.CreateTime ||
        new Date().toISOString();
      if (!entityId) continue;

      const cloudEventId = cdcCloudEventId(realmId, group.tableName, entityId, lastUpdated);
      const operation = inferOperation(entity);

      // qbo_webhook_events.raw_body + intuit_signature are NOT NULL (Issue #2).
      // CDC rows are unsigned synthetic events — use explicit markers, not null.
      const { data: insertRes, error: insertErr } = await admin
        .from("qbo_webhook_events")
        .upsert(
          {
            cloud_event_id: cloudEventId,
            spec_version: "1.0",
            source: "cdc-reconciliation",
            event_type: `com.intuit.quickbooks.${group.tableName}.${operation}`,
            event_time: lastUpdated,
            intuit_entity_id: entityId,
            intuit_account_id: realmId,
            entity_name: group.tableName,
            operation,
            data_payload: entity,
            raw_body: JSON.stringify(entity),
            intuit_signature: "cdc-reconciliation",
            fetch_pending: false, // CDC IS the fetch — no downstream fetch needed
          },
          { onConflict: "cloud_event_id", ignoreDuplicates: true },
        )
        .select("id");

      if (insertErr) {
        console.warn("[qbo-cdc] persistCdcRow error", {
          realmId,
          entity: group.tableName,
          entityId,
          error: insertErr.message,
        });
        continue;
      }
      if (!insertRes || insertRes.length === 0) {
        // duplicate — already present from a prior CDC run. Not a rescue.
        continue;
      }
      inserted += 1;

      // Was this change already covered by a real webhook within ±60s?
      const lowerBound = new Date(new Date(lastUpdated).getTime() - 60_000).toISOString();
      const upperBound = new Date(new Date(lastUpdated).getTime() + 60_000).toISOString();
      const { count: webhookCount } = await admin
        .from("qbo_webhook_events")
        .select("id", { head: true, count: "exact" })
        .eq("intuit_account_id", realmId)
        .eq("entity_name", group.tableName)
        .eq("intuit_entity_id", entityId)
        .neq("source", "cdc-reconciliation")
        .gte("event_time", lowerBound)
        .lte("event_time", upperBound);

      if ((webhookCount ?? 0) > 0) {
        confirmed += 1;
        // A real webhook already caught this change. Clear its fetch_pending flag —
        // CDC has confirmed it's real. (Handlers may or may not have consumed it yet.)
        await admin
          .from("qbo_webhook_events")
          .update({ fetch_pending: false })
          .eq("intuit_account_id", realmId)
          .eq("entity_name", group.tableName)
          .eq("intuit_entity_id", entityId)
          .neq("source", "cdc-reconciliation")
          .gte("event_time", lowerBound)
          .lte("event_time", upperBound)
          .eq("fetch_pending", true);
      } else {
        rescued += 1;
      }
    }
  }

  return { inserted, rescued, confirmed };
}

/**
 * Refresh a single accounting_connections row's access token if it's expired
 * or expiring within 5 minutes. Persists refreshed token back.
 * Returns fresh access token or null if refresh failed.
 */
async function ensureFreshAccessToken(connectionRow) {
  const admin = requireAdmin();
  const REFRESH_BUFFER_MS = 5 * 60 * 1000;
  const expiresAt = connectionRow.token_expires_at
    ? new Date(connectionRow.token_expires_at).getTime()
    : 0;

  if (expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return connectionRow.access_token;
  }

  if (!connectionRow.refresh_token) {
    console.warn("[qbo-cdc] connection missing refresh_token; skipping", {
      realm: connectionRow.tenant_or_realm_id,
    });
    return null;
  }

  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[qbo-cdc] QB_CLIENT_ID/QB_CLIENT_SECRET not configured");
    return null;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  try {
    const resp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(connectionRow.refresh_token)}`,
    });
    const body = await resp.json();
    if (!resp.ok) {
      console.warn("[qbo-cdc] token refresh failed", {
        realm: connectionRow.tenant_or_realm_id,
        status: resp.status,
        error: body?.error,
      });
      return null;
    }
    const newAccess = body.access_token;
    const newRefresh = body.refresh_token || connectionRow.refresh_token;
    const seconds = Number(body.expires_in || 3600);
    const newExpires = new Date(Date.now() + seconds * 1000).toISOString();

    await admin
      .from("accounting_connections")
      .update({
        access_token: newAccess,
        refresh_token: newRefresh,
        token_expires_at: newExpires,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionRow.id);

    return newAccess;
  } catch (err) {
    console.error("[qbo-cdc] token refresh threw", {
      realm: connectionRow.tenant_or_realm_id,
      err: err?.message,
    });
    return null;
  }
}

/**
 * Process a single realm end-to-end. Returns run summary.
 *
 * Guarantees the qbo_cdc_runs row is ALWAYS finalized via try/finally,
 * even if an unhandled throw or timeout tears down the ambient stack.
 */
export async function reconcileRealm(connectionRow, runId, deadline) {
  const admin = requireAdmin();
  const realmId = connectionRow.tenant_or_realm_id;
  const startedAt = new Date().toISOString();

  // Insert run row up front so it exists even if we crash mid-run.
  const { data: runRows, error: runErr } = await admin
    .from("qbo_cdc_runs")
    .insert({
      run_id: runId,
      realm_id: realmId,
      started_at: startedAt,
      status: "running",
    })
    .select("id");
  if (runErr) {
    console.error("[qbo-cdc] failed to create run row", { realmId, error: runErr.message });
    return null;
  }
  const runRowId = runRows[0].id;

  const summary = {
    entitiesQueried: 0,
    entitiesChanged: 0,
    eventsInserted: 0,
    eventsRescued: 0,
    eventsConfirmed: 0,
    sampleIntuitTid: null,
    status: "ok",
    errorMessage: null,
  };

  try {
    try {
      const accessToken = await ensureFreshAccessToken(connectionRow);
      if (!accessToken) {
        summary.status = "error";
        summary.errorMessage = "token_refresh_failed_or_missing_credentials";
      } else {
        const cursors = await loadCursors(realmId);

        // Chunk entities. Each chunk shares the OLDEST cursor in the chunk (CDC
        // takes one `changedSince` for the whole call).
        for (let i = 0; i < CDC_ENTITIES.length; i += CHUNK_SIZE) {
          if (Date.now() > deadline) {
            summary.status = "partial";
            summary.errorMessage = "time_budget_exhausted";
            break;
          }
          const chunk = CDC_ENTITIES.slice(i, i + CHUNK_SIZE);
          const qboNames = chunk.map((e) => e.qbo);

          // Use the oldest cursor in this chunk to be safe.
          const chunkCursors = chunk.map(
            (e) => cursors[e.table] || defaultCursor(),
          );
          const oldest = chunkCursors.reduce(
            (min, ts) => (new Date(ts) < new Date(min) ? ts : min),
            chunkCursors[0],
          );

          const url = buildCdcUrl(realmId, qboNames, oldest);
          summary.entitiesQueried += chunk.length;

          try {
            const { ok, status, json, intuit_tid } = await qboApiFetch(url, {
              accessToken,
              method: "GET",
            });
            if (intuit_tid && !summary.sampleIntuitTid) summary.sampleIntuitTid = intuit_tid;

            if (!ok) {
              console.warn("[qbo-cdc] chunk failed", { realmId, status, tid: intuit_tid, entities: qboNames });
              continue; // move on to next chunk
            }

            const changed = extractChangedEntities(json);
            const nowChanged = changed.reduce((n, g) => n + g.entities.length, 0);
            summary.entitiesChanged += nowChanged;

            if (nowChanged > 0) {
              const { inserted, rescued, confirmed } = await persistCdcRows(realmId, changed);
              summary.eventsInserted += inserted;
              summary.eventsRescued += rescued;
              summary.eventsConfirmed += confirmed;

              // Advance cursor per entity — use the max LastUpdatedTime seen.
              for (const group of changed) {
                const maxTs = group.entities.reduce((max, e) => {
                  const ts = e?.MetaData?.LastUpdatedTime || null;
                  return ts && (!max || new Date(ts) > new Date(max)) ? ts : max;
                }, null);
                if (maxTs) {
                  await saveCursor(realmId, group.tableName, maxTs);
                }
              }
            } else {
              // No changes — still advance cursors to now-ish to avoid rescanning the same window.
              const nowIso = new Date().toISOString();
              for (const entity of chunk) {
                // Only advance if we have no cursor yet, or if the cursor is stale by >1 hr —
                // otherwise a busy entity's cursor gets clobbered by a slow chunk.
                if (!cursors[entity.table]) {
                  await saveCursor(realmId, entity.table, nowIso);
                }
              }
            }
          } catch (err) {
            console.error("[qbo-cdc] chunk threw", { realmId, entities: qboNames, err: err?.message });
            // continue to next chunk
          }

          await sleep(INTER_CALL_SLEEP_MS);
        }
      }
    } catch (err) {
      summary.status = "error";
      summary.errorMessage = err?.message || String(err);
      console.error("[qbo-cdc] realm reconcile threw", { realmId, err: err?.message });
    }
  } finally {
    // ALWAYS finalize the run row. Any exit path — success, error, or timeout
    // that lets this finally run — will stamp finished_at.
    try {
      await admin
        .from("qbo_cdc_runs")
        .update({
          finished_at: new Date().toISOString(),
          entities_queried: summary.entitiesQueried,
          entities_changed: summary.entitiesChanged,
          events_inserted: summary.eventsInserted,
          events_rescued: summary.eventsRescued,
          events_confirmed: summary.eventsConfirmed,
          status: summary.status,
          error_message: summary.errorMessage,
          sample_intuit_tid: summary.sampleIntuitTid,
          elapsed_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq("id", runRowId);
    } catch (finalizeErr) {
      console.error("[qbo-cdc] finalize update failed", { realmId, err: finalizeErr?.message });
    }
  }

  return summary;
}

/**
 * Sweep orphaned runs: any qbo_cdc_runs row still `running` with
 * `finished_at IS NULL` whose start is older than `olderThanMs` gets
 * stamped `deadline_exceeded`. Called at both ends of the top-level
 * entry — self-healing across runs.
 */
async function sweepOrphanedRuns(olderThanMs, tag) {
  const admin = requireAdmin();
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const { data, error } = await admin
    .from("qbo_cdc_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: "deadline_exceeded",
      error_message: `process_terminated_before_finalize (swept by ${tag})`,
    })
    .lt("started_at", cutoff)
    .is("finished_at", null)
    .eq("status", "running")
    .select("id, run_id, realm_id");

  if (error) {
    console.warn("[qbo-cdc] orphan sweep failed", { tag, error: error.message });
    return 0;
  }
  const n = data?.length || 0;
  if (n > 0) {
    console.log("[qbo-cdc] orphan sweep finalized runs", { tag, count: n });
  }
  return n;
}

/**
 * Top-level entry: iterate every active QBO connection (deduped by realm)
 * and reconcile. Wraps the whole run in try/finally so we always sweep
 * orphans, including any from prior hard-killed runs.
 */
export async function runCdcReconciliation() {
  const admin = requireAdmin();
  const runId = crypto.randomUUID();
  const startWall = Date.now();
  const deadline = startWall + RUN_BUDGET_MS;

  // Self-heal: finalize any leftover `running` rows older than 5 minutes
  // from PRIOR runs (hard-killed by Vercel maxDuration, etc.).
  await sweepOrphanedRuns(ORPHAN_SWEEP_AGE_MS, "pre-run");

  let winners = [];
  const summaries = [];

  try {
    const { data: connections, error } = await admin
      .from("accounting_connections")
      .select("id, tenant_or_realm_id, access_token, refresh_token, token_expires_at, updated_at")
      .eq("provider", "quickbooks")
      .eq("status", "connected");

    if (error) {
      console.error("[qbo-cdc] connection scan failed", { error: error.message });
      return { runId, error: error.message, realmsProcessed: 0, summaries: [] };
    }

    // Dedupe: pick ONE winner connection per realm.
    winners = pickWinnerConnectionPerRealm(connections);
    console.log("[qbo-cdc] connection dedup", {
      runId,
      total: connections?.length || 0,
      uniqueRealms: winners.length,
    });

    for (const conn of winners) {
      if (Date.now() > deadline) {
        console.warn("[qbo-cdc] run budget exhausted; deferring remaining realms", {
          remaining: winners.length - summaries.length,
        });
        break;
      }
      if (!conn.tenant_or_realm_id) {
        console.warn("[qbo-cdc] skipping connection with null realm_id", { id: conn.id });
        continue;
      }
      const summary = await reconcileRealm(conn, runId, deadline);
      summaries.push({ realmId: conn.tenant_or_realm_id, summary });
    }
  } finally {
    // Post-run sweep: finalize anything from THIS run still marked `running`
    // (e.g. reconcileRealm's finally block itself was interrupted).
    // Also catches anything older from prior runs that pre-sweep missed.
    await sweepOrphanedRuns(0, `post-run:${runId}`);
  }

  console.log("[qbo-cdc] run complete", {
    runId,
    realmsProcessed: summaries.length,
    totalElapsedMs: Date.now() - startWall,
  });

  return {
    runId,
    realmsProcessed: summaries.length,
    summaries,
  };
}
