/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const CUSTOMER_EMAIL = "demo@advisacor.com";
const CUSTOMER_COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const CUSTOMER_COMPANY_NAME = "Advisacor Customer Demo Company";

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

function monthDate(monthsAgo) {
  const date = new Date(Date.UTC(2026, 4 - monthsAgo, 1));
  return date.toISOString().slice(0, 10);
}

function buildSnapshots(userId) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthIndex = 11 - index;
    const revenue = 860000 + index * 41000 + (index % 3) * 18000;
    const grossMargin = 0.42 - index * 0.003;
    const grossProfit = Math.round(revenue * grossMargin);
    const payroll = 214000 + index * 6200;
    const operatingExpenses = 265000 + index * 7800;
    const netIncome = grossProfit - payroll - operatingExpenses;
    const cash = 610000 + index * 19000 - (index > 8 ? 52000 : 0);
    const ar = 240000 + index * 17000;
    const inventory = 360000 + index * 21000;
    const employees = 32 + Math.floor(index / 3);

    return {
      company_id: CUSTOMER_COMPANY_ID,
      user_id: userId,
      period_start: monthDate(monthIndex),
      period_end: monthDate(monthIndex - 1),
      profit_and_loss: {
        revenue,
        gross_profit: grossProfit,
        payroll,
        operating_expenses: operatingExpenses,
        net_income: netIncome,
        gross_margin_percent: Number((grossMargin * 100).toFixed(1)),
      },
      balance_sheet: {
        cash,
        accounts_receivable: ar,
        inventory,
        accounts_payable: 185000 + index * 9000,
        debt: 820000 - index * 7000,
        equity: 1420000 + index * 26000,
      },
      cash_flow: {
        beginning_cash: cash - 22000,
        operating_cash_flow: 38000 - (index > 8 ? 11000 : 0),
        investing_cash_flow: index === 9 ? -125000 : -12000,
        financing_cash_flow: -8000,
        ending_cash: cash,
      },
      payroll: {
        payroll_total: payroll,
        overtime: 26000 + index * 1800,
        benefits: 41000 + index * 1200,
        payroll_growth_percent: Number((8 + index * 0.9).toFixed(1)),
      },
      employee_counts: {
        total_employees: employees,
        production: 22 + Math.floor(index / 4),
        admin: 6,
        sales: 4 + Math.floor(index / 6),
      },
      customer_metrics: {
        active_customers: 82 + index * 2,
        top_customer_revenue_percent: 18 + Math.floor(index / 4),
        ar_over_60_days: 42000 + index * 6500,
        revenue_per_customer: Math.round(revenue / (82 + index * 2)),
      },
      vendor_metrics: {
        active_vendors: 47 + Math.floor(index / 2),
        top_vendor_spend_percent: 14,
        software_subscriptions: 9200 + index * 775,
        marketing_spend: 31000 + index * 2400,
      },
      industry_metrics: {
        industry_type: "Manufacturing",
        production_efficiency_percent: 81 - index * 0.4,
        inventory_turns: Number((4.8 - index * 0.05).toFixed(2)),
        labor_efficiency_percent: 77 - index * 0.35,
      },
      forecast_data: {
        next_month_revenue: Math.round(revenue * 1.035),
        next_month_cash: Math.round(cash - 18000),
        quarter_end_revenue: Math.round(revenue * 3.08),
        year_end_revenue: Math.round(revenue * 12.2),
        confidence: index > 8 ? "Moderate" : "High",
      },
      generated_forecasts: [
        {
          type: "Pulse Predict",
          revenue_forecast: Math.round(revenue * 1.035),
          cash_forecast: Math.round(cash - 18000),
        },
      ],
      generated_reports: [
        {
          type: "Monthly Executive Package",
          status: "generated",
          title: `${monthDate(monthIndex).slice(0, 7)} Executive Package`,
        },
      ],
      source_metadata: {
        seed: "customer_test_account",
        company_name: CUSTOMER_COMPANY_NAME,
      },
    };
  });
}

async function seedCustomerTestAccount() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.CUSTOMER_TEST_PASSWORD || "Hal09mjhc01!";

  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials.");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingUser = await findUserByEmail(supabaseAdmin, CUSTOMER_EMAIL);
  const authResult = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        app_metadata: {
          ...(existingUser.app_metadata || {}),
          role: "customer",
          internal_admin: false,
          subscription_plan: "advisacor_cfo",
          subscription_status: "active",
        },
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          role: "customer",
          subscription_plan: "advisacor_cfo",
          subscription_status: "active",
          company: CUSTOMER_COMPANY_NAME,
          purpose: "Customer experience QA account",
        },
      })
    : await supabaseAdmin.auth.admin.createUser({
        email: CUSTOMER_EMAIL,
        password,
        email_confirm: true,
        app_metadata: {
          role: "customer",
          internal_admin: false,
          subscription_plan: "advisacor_cfo",
          subscription_status: "active",
        },
        user_metadata: {
          role: "customer",
          subscription_plan: "advisacor_cfo",
          subscription_status: "active",
          company: CUSTOMER_COMPANY_NAME,
          purpose: "Customer experience QA account",
        },
      });

  if (authResult.error) throw authResult.error;
  const user = authResult.data.user;

  const userPayload = {
    id: user.id,
    email: CUSTOMER_EMAIL,
    first_name: "Demo",
    last_name: "Customer",
    business_name: CUSTOMER_COMPANY_NAME,
    role: "customer",
    internal_admin: false,
    subscription_status: "active",
    subscription_plan: "advisacor_cfo",
    updated_at: new Date().toISOString(),
  };

  const userUpsert = await supabaseAdmin.from("users").upsert(userPayload, { onConflict: "id" });
  if (userUpsert.error) {
    const fallback = await supabaseAdmin.from("users").upsert(
      {
        id: user.id,
        email: CUSTOMER_EMAIL,
        business_name: CUSTOMER_COMPANY_NAME,
        trial_used: true,
        subscription_status: "active",
      },
      { onConflict: "id" },
    );
    if (fallback.error) console.warn("[seed-customer-test-account] users upsert skipped:", fallback.error.message);
  }

  const companyUpsert = await supabaseAdmin.from("companies").upsert({
    id: CUSTOMER_COMPANY_ID,
    name: CUSTOMER_COMPANY_NAME,
    industry: "Precision manufacturing",
    industry_type: "Manufacturing",
    revenue_range: "$10M-$25M",
    employee_count: 38,
    accounting_system: "QuickBooks Online",
    reporting_cadence: "Monthly",
    primary_persona: "business-owner",
    package_level: "advisacor_cfo",
    billing_status: "active",
    onboarding_status: "complete",
    is_demo: false,
    updated_at: new Date().toISOString(),
  });
  if (companyUpsert.error) console.warn("[seed-customer-test-account] companies upsert skipped:", companyUpsert.error.message);

  const companyUserUpsert = await supabaseAdmin.from("company_users").upsert(
    {
      company_id: CUSTOMER_COMPANY_ID,
      user_id: user.id,
      role: "company_admin",
      status: "active",
      invited_by: user.id,
    },
    { onConflict: "company_id,user_id" },
  );
  if (companyUserUpsert.error) console.warn("[seed-customer-test-account] company_users upsert skipped:", companyUserUpsert.error.message);

  await supabaseAdmin.from("pulse_historical_snapshots").delete().eq("company_id", CUSTOMER_COMPANY_ID);
  const snapshotInsert = await supabaseAdmin.from("pulse_historical_snapshots").insert(buildSnapshots(user.id));
  if (snapshotInsert.error) throw snapshotInsert.error;

  await supabaseAdmin.from("pulse_conversation_memory").delete().eq("company_id", CUSTOMER_COMPANY_ID);
  const conversationInsert = await supabaseAdmin.from("pulse_conversation_memory").insert([
    {
      company_id: CUSTOMER_COMPANY_ID,
      user_id: user.id,
      question: "Where can I reduce expenses?",
      response: "Pulse identified overtime, software subscriptions, and marketing efficiency as the highest-value review areas.",
      intent: "expense_reduction",
      source_context: { seed: "customer_test_account" },
    },
    {
      company_id: CUSTOMER_COMPANY_ID,
      user_id: user.id,
      question: "Why is cash lower this month?",
      response: "Cash is lower because AR, payroll, and inventory purchases increased faster than receipts.",
      intent: "cash_explanation",
      source_context: { seed: "customer_test_account" },
    },
  ]);
  if (conversationInsert.error) throw conversationInsert.error;

  console.log(`[seed-customer-test-account] ${existingUser ? "Updated" : "Created"} ${CUSTOMER_EMAIL}`);
  console.log(`[seed-customer-test-account] Company: ${CUSTOMER_COMPANY_NAME}`);
  console.log("[seed-customer-test-account] Subscription: Advisacor CFO / active");
  console.log("[seed-customer-test-account] Demo Pulse snapshots: 12 months");
  console.log(`[seed-customer-test-account] Password: ${process.env.CUSTOMER_TEST_PASSWORD ? "from CUSTOMER_TEST_PASSWORD" : "Hal09mjhc01!"}`);
}

seedCustomerTestAccount().catch((error) => {
  console.error("[seed-customer-test-account] Failed:", error?.message || error);
  process.exitCode = 1;
});
