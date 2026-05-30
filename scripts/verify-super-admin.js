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

async function findUserByEmail(supabaseAdmin, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (!data?.users || data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function verifySuperAdmin() {
  loadLocalEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const user = await findUserByEmail(supabaseAdmin, SUPER_ADMIN_EMAIL);
  if (!user) throw new Error(`${SUPER_ADMIN_EMAIL} was not found.`);

  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;
  if (appRole !== "super_admin" && userRole !== "super_admin") {
    throw new Error(`${SUPER_ADMIN_EMAIL} exists, but role metadata is not super_admin.`);
  }

  console.log(`${SUPER_ADMIN_EMAIL}: exists`);
  console.log("Role: super_admin");
  console.log(`Email confirmed: ${user.email_confirmed_at ? "yes" : "no"}`);
}

verifySuperAdmin().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
