const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const INITIAL_SUPER_ADMIN_EMAIL = "mwiseman@advisacor.com";
const SUPER_ADMIN_ROLE = "super_admin";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const envFile = fs.readFileSync(envPath, "utf8");
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) return;

    process.env[key] = value.replace(/^["']|["']$/g, "");
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

async function upsertUserProfile(supabaseAdmin, userId, email) {
  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: userId,
        email,
        first_name: "Matt",
        last_name: "Wiseman",
        business_name: "Wiseman Financial Technologies LLC",
        role: SUPER_ADMIN_ROLE,
        internal_admin: true,
        subscription_status: "active",
        subscription_plan: "virtualCfo",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    const message = String(error?.message || "").toLowerCase();
    const isSchemaNotReady =
      error?.code === "42P01" ||
      error?.code === "42703" ||
      message.includes("schema cache") ||
      message.includes("column");
    if (!isSchemaNotReady) throw error;
    console.warn("[seed-super-admin] Skipped users profile upsert; table/columns are not configured yet.");
  }
}

async function seedSuperAdmin() {
  loadLocalEnv();

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    console.log("[seed-super-admin] Skipping production environment.");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.SUPER_ADMIN_DEV_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log("[seed-super-admin] Skipping; Supabase service credentials are not configured.");
    return;
  }

  if (!password) {
    console.log("[seed-super-admin] Skipping; set SUPER_ADMIN_DEV_PASSWORD to create the dev super admin user.");
    return;
  }

  if (password.length < 12) {
    throw new Error("SUPER_ADMIN_DEV_PASSWORD must be at least 12 characters.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const email = INITIAL_SUPER_ADMIN_EMAIL;
  const existingUser = await findUserByEmail(supabaseAdmin, email);

  const { data, error } = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        app_metadata: {
          ...(existingUser.app_metadata || {}),
          role: SUPER_ADMIN_ROLE,
          internal_admin: true,
        },
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          role: SUPER_ADMIN_ROLE,
          internal_admin: true,
          company: "Wiseman Financial Technologies LLC",
          purpose: "Internal Advisacor testing and administration",
        },
      })
    : await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          role: SUPER_ADMIN_ROLE,
          internal_admin: true,
        },
        user_metadata: {
          role: SUPER_ADMIN_ROLE,
          internal_admin: true,
          company: "Wiseman Financial Technologies LLC",
          purpose: "Internal Advisacor testing and administration",
        },
      });

  if (error) throw error;

  await upsertUserProfile(supabaseAdmin, data.user.id, email);

  const { error: auditError } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      event_type: "super_admin_seeded",
      actor_user_id: data.user.id,
      actor_email: email,
      resource_type: "super_admin",
      resource_id: data.user.id,
      metadata: {
        role: SUPER_ADMIN_ROLE,
        environment: process.env.NODE_ENV || "development",
        existing_user: Boolean(existingUser),
      },
      created_at: new Date().toISOString(),
    });

  if (auditError) {
    console.warn("[seed-super-admin] Skipped audit log insert; audit_logs table is not configured yet.");
  }

  console.log(`[seed-super-admin] ${existingUser ? "Updated" : "Created"} ${email} for development Super Admin Mode.`);
}

seedSuperAdmin().catch((error) => {
  console.error("[seed-super-admin] Failed:", error?.message || error);
  process.exitCode = 1;
});
