/**
 * D1 smoke test — QBO write readiness (token resolver, health check, preflight).
 *
 * Does NOT perform any live QBO writes. If the test firm_client has no QBO
 * connection, the QBO-dependent steps SKIP (still a PASS overall).
 *
 * Requires the D1 migration applied and env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   (QB_CLIENT_ID/QB_CLIENT_SECRET/QB_ENVIRONMENT only needed if a connection exists)
 *
 * Run:  npx tsx scripts/smoke/d1-qbo-write-readiness-smoke.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path: string) {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(".env.local");
loadEnv(".env");

import { resolveQBOTokenForFirmClient } from "../../lib/erp/quickbooks/token-resolver";
import { checkQBOHealth } from "../../lib/erp/quickbooks/health-checker";
import { canPostToQBO } from "../../lib/erp/quickbooks/write-preflight";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";

let passCount = 0;
let failCount = 0;
let skipCount = 0;
function pass(name: string, detail?: string) {
  passCount++;
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  failCount++;
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name: string, detail?: string) {
  skipCount++;
  console.log(`  SKIP  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("=== D1 QBO write readiness smoke test ===\n");

  // Confirm test client exists (created in D0 smoke).
  const { data: client, error: clientErr } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id, qbo_write_enabled")
    .eq("id", TEST_FIRM_CLIENT_ID)
    .maybeSingle();
  if (clientErr) {
    fail("test firm_client exists", `${clientErr.message} (is the D1 migration applied?)`);
    summary();
    return;
  }
  if (!client) {
    fail("test firm_client exists", `not found: ${TEST_FIRM_CLIENT_ID} (run D0 smoke first)`);
    summary();
    return;
  }
  pass("test firm_client exists", TEST_FIRM_CLIENT_ID);

  // 2. owner_user_id populated (D1.1 backfill)
  if (client.owner_user_id) {
    pass("firm_client has owner_user_id", client.owner_user_id as string);
  } else {
    fail("firm_client has owner_user_id", "null — apply D1.1 backfill migration");
  }

  // 3. resolveQBOTokenForFirmClient
  const bundle = await resolveQBOTokenForFirmClient(TEST_FIRM_CLIENT_ID);
  if (!bundle) {
    skip(
      "resolveQBOTokenForFirmClient",
      "owner has no accounting_connections QBO row in this env — skipping health/preflight-write steps",
    );
    // Still verify the write-disabled path works without a connection.
    const disabled = await canPostToQBO(TEST_FIRM_CLIENT_ID);
    if (!disabled.canWrite && disabled.reason === "write_disabled") {
      pass("canPostToQBO blocks when write disabled", `reason=${disabled.reason}`);
    } else {
      fail("canPostToQBO blocks when write disabled", `got canWrite=${disabled.canWrite} reason=${disabled.reason}`);
    }
    summary();
    return;
  }
  pass("resolveQBOTokenForFirmClient", `source=${bundle.tokenSource} realm=${bundle.realmId}`);

  // 2a. checkQBOHealth writes a log row
  const beforeCount = await healthLogCount();
  const health = await checkQBOHealth(TEST_FIRM_CLIENT_ID);
  const afterCount = await healthLogCount();
  if (afterCount > beforeCount) {
    pass("checkQBOHealth wrote qbo_health_check_log row", `status=${health.status}`);
  } else {
    fail("checkQBOHealth wrote qbo_health_check_log row", `count ${beforeCount} -> ${afterCount}`);
  }

  // 2b. canPostToQBO = false while write disabled
  await supabase.from("firm_clients").update({ qbo_write_enabled: false }).eq("id", TEST_FIRM_CLIENT_ID);
  const pre = await canPostToQBO(TEST_FIRM_CLIENT_ID);
  if (!pre.canWrite && pre.reason === "write_disabled") {
    pass("canPostToQBO false when write disabled", `reason=${pre.reason}`);
  } else {
    fail("canPostToQBO false when write disabled", `canWrite=${pre.canWrite} reason=${pre.reason}`);
  }

  // 2c. Simulate enabling write via direct DB update.
  await supabase.from("firm_clients").update({ qbo_write_enabled: true }).eq("id", TEST_FIRM_CLIENT_ID);

  // 2d. canPostToQBO reflects health outcome once write is enabled.
  const post = await canPostToQBO(TEST_FIRM_CLIENT_ID);
  if (health.status === "healthy") {
    if (post.canWrite) {
      pass("canPostToQBO true when enabled + healthy", "canWrite=true");
    } else {
      fail("canPostToQBO true when enabled + healthy", `canWrite=false reason=${post.reason}`);
    }
  } else {
    // Connection exists but not healthy (e.g. sandbox token expired) — preflight
    // must refuse for a non-write_disabled reason.
    if (!post.canWrite && post.reason !== "write_disabled") {
      pass("canPostToQBO refuses unhealthy connection", `reason=${post.reason} (health=${health.status})`);
    } else {
      fail("canPostToQBO refuses unhealthy connection", `canWrite=${post.canWrite} reason=${post.reason}`);
    }
  }

  // Reset write flag to OFF (safe default).
  await supabase.from("firm_clients").update({ qbo_write_enabled: false }).eq("id", TEST_FIRM_CLIENT_ID);

  summary();
}

async function healthLogCount(): Promise<number> {
  const { count } = await supabase
    .from("qbo_health_check_log")
    .select("*", { count: "exact", head: true })
    .eq("firm_client_id", TEST_FIRM_CLIENT_ID);
  return count ?? 0;
}

function summary() {
  console.log(`\n=== SUMMARY: ${passCount} passed, ${failCount} failed, ${skipCount} skipped ===`);
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE TEST ERROR:", err);
  process.exit(1);
});
