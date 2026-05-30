const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const SUPER_ADMIN_EMAIL = "mwiseman@advisacor.com";

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

async function verifyAdminHealth() {
  loadLocalEnv();

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_DEV_PASSWORD,
  });

  if (error || !data.session?.access_token) throw new Error("Super admin sign-in failed.");

  const response = await fetch(`${process.env.ADMIN_VERIFY_BASE_URL || "http://localhost:3000"}/api/admin/overview`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
  });

  if (!response.ok) throw new Error(`Admin overview failed: HTTP ${response.status}`);
  const result = await response.json();

  const health = result.system_health || {};
  console.log(`job_storage_configured: ${health.job_storage_configured ? "Configured" : "Needs setup"}`);
  console.log(`background_jobs_table_configured: ${health.background_jobs_table_configured ? "Configured" : "Needs setup"}`);
  console.log(`background_jobs_configured: ${health.background_jobs_configured ? "Configured" : "Needs setup"}`);
  console.log(`job_queue_configured: ${health.job_queue_configured ? "Configured" : "Needs setup"}`);
  console.log(`audit_log_storage_configured: ${health.audit_log_storage_configured ? "Configured" : "Needs setup"}`);
  console.log(`jobs returned: ${result.jobs?.length || 0}`);
  console.log(`audit logs returned: ${result.audit_logs?.length || 0}`);

  if (
    !health.background_jobs_table_configured ||
    !health.job_storage_configured ||
    !health.audit_log_storage_configured ||
    !result.jobs?.length ||
    !result.audit_logs?.length
  ) {
    throw new Error("Admin dashboard health is not fully configured.");
  }
}

verifyAdminHealth().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
