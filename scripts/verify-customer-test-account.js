/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const CUSTOMER_EMAIL = "demo@advisacor.com";
const CUSTOMER_COMPANY_ID = "33333333-3333-4333-8333-333333333333";

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

async function verifyCustomerTestAccount() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials.");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

  const user = await findUserByEmail(supabaseAdmin, CUSTOMER_EMAIL);
  if (!user) throw new Error("Customer test auth user not found.");
  if (user.app_metadata?.role === "super_admin" || user.user_metadata?.role === "super_admin") {
    throw new Error("Customer test user must not have Super Admin role.");
  }

  let { data: profileRows, error: profileError } = await supabaseAdmin
    .from("users")
    .select("email, business_name, role, internal_admin, subscription_status, subscription_plan")
    .eq("email", CUSTOMER_EMAIL)
    .limit(1);
  if (profileError?.code === "42703" || String(profileError?.message || "").includes("column")) {
    const fallback = await supabaseAdmin
      .from("users")
      .select("email, business_name, subscription_status")
      .eq("email", CUSTOMER_EMAIL)
      .limit(1);
    profileRows = fallback.data;
    profileError = fallback.error;
  }
  if (profileError) throw profileError;

  const { count: snapshotCount, error: snapshotError } = await supabaseAdmin
    .from("pulse_historical_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("company_id", CUSTOMER_COMPANY_ID);
  if (snapshotError) throw snapshotError;

  const { count: conversationCount, error: conversationError } = await supabaseAdmin
    .from("pulse_conversation_memory")
    .select("id", { count: "exact", head: true })
    .eq("company_id", CUSTOMER_COMPANY_ID);
  if (conversationError) throw conversationError;

  let publicSigninStatus = "not checked";
  if (publicClient) {
    const { data: signinData, error: signinError } = await publicClient.auth.signInWithPassword({
      email: CUSTOMER_EMAIL,
      password: process.env.CUSTOMER_TEST_PASSWORD || "Hal09mjhc01!",
    });
    if (signinError) throw signinError;
    publicSigninStatus = signinData?.user?.email === CUSTOMER_EMAIL ? "OK" : "unexpected user";
  }

  console.log("customer test auth user: OK");
  console.log(`customer public sign-in: ${publicSigninStatus}`);
  console.log(`email: ${CUSTOMER_EMAIL}`);
  console.log(`role: ${user.app_metadata?.role || user.user_metadata?.role || "customer"}`);
  console.log(`auth subscription: ${user.app_metadata?.subscription_plan || user.user_metadata?.subscription_plan || "not available"} / ${user.app_metadata?.subscription_status || user.user_metadata?.subscription_status || "not available"}`);
  console.log(`profile subscription: ${profileRows?.[0]?.subscription_plan || "schema fallback"} / ${profileRows?.[0]?.subscription_status || "not available"}`);
  console.log(`internal_admin: ${profileRows?.[0]?.internal_admin ?? user.app_metadata?.internal_admin ?? false}`);
  console.log(`pulse historical snapshots: ${snapshotCount ?? 0}`);
  console.log(`prior pulse conversations: ${conversationCount ?? 0}`);
}

verifyCustomerTestAccount().catch((error) => {
  console.error("[verify-customer-test-account] Failed:", error?.message || error);
  process.exitCode = 1;
});
