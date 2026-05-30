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

async function verifyAdminLoginFlow() {
  loadLocalEnv();

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_DEV_PASSWORD,
  });

  if (error || !data.session?.access_token) {
    throw new Error("Super admin sign-in failed.");
  }

  const baseUrl = process.env.ADMIN_VERIFY_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin overview access failed: HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.admin?.role !== "super_admin") {
    throw new Error("Admin overview did not return super_admin role.");
  }

  console.log("Super admin sign-in: OK");
  console.log("Admin API access: OK");
  console.log(`Demo companies available: ${result.demo_companies?.length || 0}`);
}

verifyAdminLoginFlow().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
