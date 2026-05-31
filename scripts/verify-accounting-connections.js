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

  const expectedColumns = [
    "id",
    "user_id",
    "provider",
    "provider_family",
    "provider_product",
    "external_entity_id",
    "external_entity_name",
    "token_expires_at",
    "tenant_or_realm_id",
    "scopes",
    "status",
    "metadata_json",
    "created_at",
    "updated_at",
  ];

  const { data, error, count } = await supabase
    .from("accounting_connections")
    .select(expectedColumns.join(","), { count: "exact" })
    .limit(5);

  if (error) {
    throw new Error(`accounting_connections select failed: ${error.message}`);
  }

  const { count: quickBooksCount, error: quickBooksError } = await supabase
    .from("accounting_connections")
    .select("id", { count: "exact", head: true })
    .eq("provider", "quickbooks");

  if (quickBooksError) {
    throw new Error(`QuickBooks canonical count failed: ${quickBooksError.message}`);
  }

  console.log("accounting_connections reachable: OK");
  console.log(`accounting_connections row count: ${count ?? data.length}`);
  console.log(`quickbooks canonical rows: ${quickBooksCount ?? 0}`);

  const legacyChecks = [
    ["erp_connections", "platform"],
    ["quickbooks_connections", null],
  ];

  for (const [tableName, platformColumn] of legacyChecks) {
    let query = supabase.from(tableName).select("id", { count: "exact", head: true });
    if (platformColumn) query = query.eq(platformColumn, "quickbooks");
    const { count: legacyCount, error: legacyError } = await query;
    if (legacyError) {
      console.log(`${tableName} legacy check: unavailable (${legacyError.message})`);
    } else {
      console.log(`${tableName} legacy rows: ${legacyCount ?? 0}`);
    }
  }

  console.log(
    "sample rows:",
    JSON.stringify(
      (data || []).map((row) => ({
        id: row.id,
        provider: row.provider,
        provider_family: row.provider_family,
        provider_product: row.provider_product,
        external_entity_id: row.external_entity_id,
        external_entity_name: row.external_entity_name,
        tenant_or_realm_id: row.tenant_or_realm_id,
        status: row.status,
        scopes_count: Array.isArray(row.scopes) ? row.scopes.length : 0,
        has_metadata: Boolean(row.metadata_json),
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
      null,
      2,
    ),
  );
}

verify().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
