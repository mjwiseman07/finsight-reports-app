/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const demoEmails = [
  "demo.landscaping@advisacor.com",
  "demo.hvac@advisacor.com",
  "demo.accounting@advisacor.com",
  "demo.manufacturing@advisacor.com",
];

const demoCompanyIds = [
  "44444444-4444-4444-8444-111111111111",
  "44444444-4444-4444-8444-222222222222",
  "44444444-4444-4444-8444-333333333333",
  "44444444-4444-4444-8444-444444444444",
];

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

async function countRows(supabaseAdmin, table, companyId) {
  const { count, error } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId);
  if (error) throw error;
  return count || 0;
}

async function verifyDemoEnvironments() {
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

  for (let index = 0; index < demoEmails.length; index += 1) {
    const email = demoEmails[index];
    const companyId = demoCompanyIds[index];
    const user = await findUserByEmail(supabaseAdmin, email);
    if (!user) throw new Error(`${email} auth user not found.`);
    if (user.app_metadata?.role === "super_admin" || user.user_metadata?.role === "super_admin") {
      throw new Error(`${email} must not have Super Admin role.`);
    }

    const snapshots = await countRows(supabaseAdmin, "pulse_historical_snapshots", companyId);
    const conversations = await countRows(supabaseAdmin, "pulse_conversation_memory", companyId);
    const insights = await countRows(supabaseAdmin, "pulse_insight_memory", companyId);
    if (snapshots < 12) throw new Error(`${email} has fewer than 12 historical snapshots.`);
    if (conversations < 2) throw new Error(`${email} has fewer than 2 Pulse conversations.`);
    if (insights < 4) throw new Error(`${email} has fewer than 4 insight memory entries.`);

    let signinStatus = "not checked";
    if (publicClient) {
      const { data: signinData, error: signinError } = await publicClient.auth.signInWithPassword({
        email,
        password: process.env.DEMO_CUSTOMER_PASSWORD || "Hal09mjhc01!",
      });
      if (signinError) throw signinError;
      signinStatus = signinData?.user?.email === email ? "sign-in OK" : "unexpected user";
      await publicClient.auth.signOut();
    }

    console.log(`${email}: ${user.app_metadata?.subscription_plan} / ${signinStatus} / snapshots ${snapshots} / conversations ${conversations} / insights ${insights}`);
  }

  console.log("[verify-demo-environments] All demo environments verified.");
}

verifyDemoEnvironments().catch((error) => {
  console.error("[verify-demo-environments] Failed:", error?.message || error);
  process.exitCode = 1;
});
