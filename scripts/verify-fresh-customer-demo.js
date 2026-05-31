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

async function verifyFreshCustomerDemo() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error("Missing Supabase credentials.");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({
    email: FRESH_CUSTOMER_EMAIL,
    password: FRESH_CUSTOMER_PASSWORD,
  });
  if (signInError) throw signInError;
  const userId = signInData.user.id;

  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from("users")
    .select("email, business_name, trial_used, subscription_status")
    .eq("id", userId)
    .limit(1);
  if (profileError) throw profileError;
  const profile = profileRows?.[0];
  if (!profile) throw new Error("Fresh customer profile not found.");
  if (profile.trial_used !== false || profile.subscription_status !== "trial") {
    throw new Error("Fresh customer is not in trial onboarding state.");
  }

  const { count: companyCount, error: companyError } = await supabaseAdmin
    .from("company_users")
    .select("company_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (companyError) throw companyError;
  if ((companyCount || 0) !== 0) throw new Error("Fresh customer still has company memberships.");

  console.log("fresh customer sign-in: OK");
  console.log(`email: ${FRESH_CUSTOMER_EMAIL}`);
  console.log("role: customer");
  console.log("subscription state: trial");
  console.log("trial_used: false");
  console.log("company memberships: 0");
}

verifyFreshCustomerDemo().catch((error) => {
  console.error("[verify-fresh-customer-demo] Failed:", error?.message || error);
  process.exitCode = 1;
});
