/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) return;
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    });
}

async function verify() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const snapshotColumns = [
    "id",
    "company_id",
    "client_id",
    "user_id",
    "period_start",
    "period_end",
    "profit_and_loss",
    "balance_sheet",
    "cash_flow",
    "payroll",
    "employee_counts",
    "customer_metrics",
    "vendor_metrics",
    "industry_metrics",
    "forecast_data",
    "generated_forecasts",
    "generated_reports",
    "source_metadata",
    "created_at",
    "updated_at",
  ];

  const conversationColumns = [
    "id",
    "company_id",
    "client_id",
    "user_id",
    "question",
    "response",
    "intent",
    "source_context",
    "created_at",
  ];

  const { data: snapshots, error: snapshotsError, count: snapshotsCount } = await supabase
    .from("pulse_historical_snapshots")
    .select(snapshotColumns.join(","), { count: "exact" })
    .limit(1);

  if (snapshotsError) {
    throw new Error(`pulse_historical_snapshots select failed: ${snapshotsError.message}`);
  }

  const { data: conversations, error: conversationsError, count: conversationsCount } = await supabase
    .from("pulse_conversation_memory")
    .select(conversationColumns.join(","), { count: "exact" })
    .limit(1);

  if (conversationsError) {
    throw new Error(`pulse_conversation_memory select failed: ${conversationsError.message}`);
  }

  const { data: usageEvents, error: usageError, count: usageCount } = await supabase
    .from("pulse_usage_events")
    .select("id,user_id,company_id,client_id,subscription_plan,question,response_source,tokens_estimated,created_at", { count: "exact" })
    .limit(1);

  if (usageError) {
    throw new Error(`pulse_usage_events select failed: ${usageError.message}`);
  }

  console.log("pulse_historical_snapshots reachable: OK");
  console.log(`pulse_historical_snapshots row count: ${snapshotsCount ?? snapshots.length}`);
  console.log("pulse_conversation_memory reachable: OK");
  console.log(`pulse_conversation_memory row count: ${conversationsCount ?? conversations.length}`);
  console.log("pulse_usage_events reachable: OK");
  console.log(`pulse_usage_events row count: ${usageCount ?? usageEvents.length}`);
  console.log("pulse memory schema check: OK");
}

verify().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
