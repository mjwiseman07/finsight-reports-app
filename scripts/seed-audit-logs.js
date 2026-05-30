const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) throw new Error(".env.local is missing.");

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

async function seedAuditLogs() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const rows = [
    {
      event_type: "super_admin_seed_test",
      actor_email: "mwiseman@advisacor.com",
      resource_type: "super_admin",
      resource_id: "demo-audit-seed",
      metadata: { source: "seed-audit-logs", purpose: "verify audit log storage" },
    },
    {
      event_type: "super_admin_impersonation_started",
      actor_email: "mwiseman@advisacor.com",
      company_id: "demo-manufacturing",
      resource_type: "super_admin",
      resource_id: "demo-manufacturing",
      metadata: { test_only: true, persona_mode: "Business Owner", package_level: "Virtual CFO" },
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .insert(rows)
    .select("id, event_type, actor_email, created_at");

  if (error) {
    console.error("Unable to seed audit_logs.");
    console.error(`Error code: ${error.code || "none"}`);
    console.error(`Error message: ${error.message}`);
    console.error("Next step: run supabase/migrations/20260529_create_audit_logs.sql in the Supabase SQL Editor, then rerun npm run seed:audit-logs.");
    process.exitCode = 1;
    return;
  }

  console.log(`Seeded audit_logs rows: ${data.length}`);
  data.forEach((row) => console.log(`${row.event_type}: ${row.actor_email || "no actor email"}`));
}

seedAuditLogs().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
