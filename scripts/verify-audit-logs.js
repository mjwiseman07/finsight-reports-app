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

async function verifyAuditLogs() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabaseAdmin.from("audit_logs").select("*").limit(5);

  if (error) {
    console.log("audit_logs table: not operational");
    console.log(`error code: ${error.code || "none"}`);
    console.log(`error message: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log("audit_logs table: operational");
  console.log(`row count checked: ${data.length}`);
  console.log(`columns: ${Object.keys(data[0] || {}).join(", ") || "no rows available to infer columns"}`);
}

verifyAuditLogs().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
