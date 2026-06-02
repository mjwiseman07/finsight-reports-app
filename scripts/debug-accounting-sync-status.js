/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    }
  }
}

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("accounting_syncs")
    .select("id, connection_id, source_system, tenant_id, validation_status, created_at")
    .eq("source_system", "xero")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;

  const expectedLegacyStatuses = ["successful", "completed", "synced", "ready"];
  const standardizedExpectedStatus = "SUCCESS";
  console.log(JSON.stringify({
    packageGeneratorExpectedStatuses: expectedLegacyStatuses,
    standardizedPackageGeneratorExpectedStatus: standardizedExpectedStatus,
    latestXeroSyncs: (data || []).map((row) => ({
      syncId: row.id,
      connectionId: row.connection_id,
      sourceSystem: row.source_system,
      tenantId: row.tenant_id,
      syncStatus: row.validation_status,
      packageGeneratorFoundStatus: row.validation_status,
      createdAt: row.created_at,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
