/* eslint-disable no-console */
import { readFileSync } from "node:fs";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}
loadEnv(".env.local");

import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";

async function main() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("je_posting_audit")
    .select("status,rejection_reason,qbo_error_json,narration,idempotency_key,created_at")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));

  const { data: fc } = await supabase
    .from("firm_clients")
    .select("accounting_method,qbo_write_enabled")
    .eq("id", FIRM_CLIENT_ID)
    .single();
  console.log("firm_client:", fc);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
