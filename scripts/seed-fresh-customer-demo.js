/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const FRESH_CUSTOMER_EMAIL = "demo.newcustomer@advisacor.com";
const FRESH_CUSTOMER_PASSWORD = process.env.FRESH_CUSTOMER_DEMO_PASSWORD || "Hal09mjhc01!";

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

async function findUserByEmail(supabaseAdmin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data?.users || data.users.length < 100) return null;
  }
  return null;
}

async function safeDelete(label, query) {
  const { error } = await query;
  if (error) {
    const message = String(error.message || "");
    const missingSchema = error.code === "42P01" || error.code === "42703" || message.includes("schema cache");
    if (!missingSchema) console.warn(`[seed-fresh-customer-demo] ${label} cleanup skipped: ${error.message}`);
  }
}

async function resetFreshCustomerData(supabaseAdmin, userId) {
  const { data: memberships } = await supabaseAdmin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId);
  const companyIds = (memberships || []).map((membership) => membership.company_id).filter(Boolean);

  if (companyIds.length) {
    await safeDelete("pdf package customizations", supabaseAdmin.from("pdf_package_customizations").delete().in("company_id", companyIds));
    await safeDelete("pulse usage events", supabaseAdmin.from("pulse_usage_events").delete().in("company_id", companyIds));
    await safeDelete("pulse conversations", supabaseAdmin.from("pulse_conversation_memory").delete().in("company_id", companyIds));
    await safeDelete("pulse insights", supabaseAdmin.from("pulse_insight_memory").delete().in("company_id", companyIds));
    await safeDelete("pulse snapshots", supabaseAdmin.from("pulse_historical_snapshots").delete().in("company_id", companyIds));
    await safeDelete("accounting connections", supabaseAdmin.from("accounting_connections").delete().in("company_id", companyIds));
    await safeDelete("delivery settings", supabaseAdmin.from("delivery_settings").delete().in("company_id", companyIds));
    await safeDelete("company settings", supabaseAdmin.from("company_settings").delete().in("company_id", companyIds));
    await safeDelete("onboarding progress", supabaseAdmin.from("onboarding_progress").delete().in("company_id", companyIds));
    await safeDelete("company invitations", supabaseAdmin.from("company_invitations").delete().in("company_id", companyIds));
    await safeDelete("company users", supabaseAdmin.from("company_users").delete().in("company_id", companyIds));
    await safeDelete("companies", supabaseAdmin.from("companies").delete().in("id", companyIds));
  }

  await safeDelete("user pulse usage events", supabaseAdmin.from("pulse_usage_events").delete().eq("user_id", userId));
  await safeDelete("user pulse conversations", supabaseAdmin.from("pulse_conversation_memory").delete().eq("user_id", userId));
  await safeDelete("user pulse insights", supabaseAdmin.from("pulse_insight_memory").delete().eq("user_id", userId));
  await safeDelete("user pulse snapshots", supabaseAdmin.from("pulse_historical_snapshots").delete().eq("user_id", userId));
  await safeDelete("user pdf customizations", supabaseAdmin.from("pdf_package_customizations").delete().eq("user_id", userId));
}

async function seedFreshCustomerDemo() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials.");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingUser = await findUserByEmail(supabaseAdmin, FRESH_CUSTOMER_EMAIL);
  const authPayload = {
    password: FRESH_CUSTOMER_PASSWORD,
    email_confirm: true,
    app_metadata: {
      role: "customer",
      internal_admin: false,
      onboarding_demo: true,
    },
    user_metadata: {
      first_name: "Fresh",
      last_name: "Customer",
      business_name: "",
      role: "customer",
      purpose: "Repeatable new customer onboarding QA",
    },
  };

  const { data, error } = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, authPayload)
    : await supabaseAdmin.auth.admin.createUser({ email: FRESH_CUSTOMER_EMAIL, ...authPayload });
  if (error) throw error;

  const user = data.user;
  await resetFreshCustomerData(supabaseAdmin, user.id);

  const profile = await supabaseAdmin.from("users").upsert(
    {
      id: user.id,
      email: FRESH_CUSTOMER_EMAIL,
      first_name: "Fresh",
      last_name: "Customer",
      business_name: "",
      role: "customer",
      internal_admin: false,
      trial_used: false,
      subscription_status: "trial",
      subscription_plan: null,
      subscription_price_id: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profile.error) {
    const fallback = await supabaseAdmin.from("users").upsert(
      {
        id: user.id,
        email: FRESH_CUSTOMER_EMAIL,
        first_name: "Fresh",
        last_name: "Customer",
        business_name: "",
        trial_used: false,
        subscription_status: "trial",
      },
      { onConflict: "id" },
    );
    if (fallback.error) throw fallback.error;
  }

  console.log(`[seed-fresh-customer-demo] Reset ${FRESH_CUSTOMER_EMAIL} to fresh trial onboarding state.`);
  console.log(`[seed-fresh-customer-demo] Password: ${process.env.FRESH_CUSTOMER_DEMO_PASSWORD ? "from FRESH_CUSTOMER_DEMO_PASSWORD" : FRESH_CUSTOMER_PASSWORD}`);
  console.log("[seed-fresh-customer-demo] Existing configured demo accounts were not modified.");
}

seedFreshCustomerDemo().catch((error) => {
  console.error("[seed-fresh-customer-demo] Failed:", error?.message || error);
  process.exitCode = 1;
});
