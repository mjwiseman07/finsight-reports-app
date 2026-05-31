/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const DEMO_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || "Hal09mjhc01!";

const demoAccounts = [
  {
    email: "demo.landscaping@advisacor.com",
    companyId: "44444444-4444-4444-8444-111111111111",
    company: "Demo Landscaping LLC",
    plan: "pulse_starter",
    industry: "Landscaping",
    annualRevenue: 650000,
    employees: 6,
    baseMonthlyRevenue: 54000,
    demonstrates: ["Dashboard", "Pulse AI", "Weekly briefings", "Basic forecasting", "Basic what-if scenarios"],
  },
  {
    email: "demo.hvac@advisacor.com",
    companyId: "44444444-4444-4444-8444-222222222222",
    company: "Demo HVAC Services",
    plan: "pulse_pro",
    industry: "Home Services",
    annualRevenue: 4200000,
    employees: 22,
    baseMonthlyRevenue: 350000,
    demonstrates: ["Advanced forecasting", "KPI builder", "Predictive analytics", "Advanced what-if modeling", "Predictive alerts"],
  },
  {
    email: "demo.accounting@advisacor.com",
    companyId: "44444444-4444-4444-8444-333333333333",
    company: "Demo Accounting Group",
    plan: "advisacor_professional",
    industry: "CPA Firm",
    annualRevenue: 7800000,
    employees: 48,
    clients: 40,
    baseMonthlyRevenue: 650000,
    demonstrates: ["Multi-client dashboard", "Portfolio management", "Board packages", "PowerPoint generation", "AI commentary", "White-label features"],
  },
  {
    email: "demo.manufacturing@advisacor.com",
    companyId: "44444444-4444-4444-8444-444444444444",
    company: "Demo Manufacturing Holdings",
    plan: "advisacor_cfo",
    industry: "Manufacturing",
    annualRevenue: 35000000,
    employees: 140,
    baseMonthlyRevenue: 2910000,
    demonstrates: ["Strategic planning", "Advanced forecasting", "Capital planning", "Executive scorecards", "AI CFO recommendations", "Predictive analytics"],
  },
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

function monthDate(monthsAgo) {
  const date = new Date(Date.UTC(2026, 4 - monthsAgo, 1));
  return date.toISOString().slice(0, 10);
}

function buildSnapshots(account, userId) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthIndex = 11 - index;
    const seasonalLift = account.industry === "Landscaping" && index >= 7 ? 0.18 : account.industry === "Home Services" && index >= 6 ? 0.12 : 0;
    const revenue = Math.round(account.baseMonthlyRevenue * (0.9 + index * 0.018 + seasonalLift));
    const grossMargin = account.plan === "pulse_starter" ? 0.38 : account.plan === "pulse_pro" ? 0.44 : account.plan === "advisacor_professional" ? 0.52 : 0.41;
    const grossProfit = Math.round(revenue * grossMargin);
    const payroll = Math.round(account.employees * (account.plan === "advisacor_cfo" ? 7200 : 5600) * (0.95 + index * 0.006));
    const operatingExpenses = Math.round(revenue * (account.plan === "advisacor_professional" ? 0.24 : 0.29));
    const cash = Math.round(revenue * (account.plan === "pulse_starter" ? 1.4 : account.plan === "pulse_pro" ? 1.8 : 2.2) + index * 12000);

    return {
      company_id: account.companyId,
      user_id: userId,
      period_start: monthDate(monthIndex),
      period_end: monthDate(monthIndex - 1),
      profit_and_loss: {
        revenue,
        gross_profit: grossProfit,
        payroll,
        operating_expenses: operatingExpenses,
        net_income: grossProfit - payroll - operatingExpenses,
        gross_margin_percent: Number((grossMargin * 100).toFixed(1)),
      },
      balance_sheet: {
        cash,
        accounts_receivable: Math.round(revenue * 0.34),
        inventory: account.industry === "Manufacturing" ? Math.round(revenue * 0.5) : Math.round(revenue * 0.08),
        accounts_payable: Math.round(revenue * 0.22),
        debt: Math.round(account.annualRevenue * (account.plan === "advisacor_cfo" ? 0.18 : 0.07)),
        equity: Math.round(account.annualRevenue * 0.32),
      },
      cash_flow: {
        beginning_cash: cash - 18000,
        operating_cash_flow: Math.round(revenue * 0.08),
        investing_cash_flow: account.plan === "advisacor_cfo" && index === 9 ? -425000 : -9000,
        financing_cash_flow: -5000,
        ending_cash: cash,
      },
      payroll: {
        payroll_total: payroll,
        overtime: Math.round(payroll * (account.industry === "Home Services" ? 0.11 : 0.07)),
        benefits: Math.round(payroll * 0.18),
        payroll_growth_percent: Number((5 + index * 0.55).toFixed(1)),
      },
      employee_counts: {
        total_employees: account.employees,
        operations: Math.round(account.employees * 0.68),
        admin: Math.max(1, Math.round(account.employees * 0.14)),
        sales: Math.max(1, Math.round(account.employees * 0.1)),
      },
      customer_metrics: {
        active_customers: account.clients || Math.round(account.annualRevenue / 85000),
        top_customer_revenue_percent: account.plan === "advisacor_cfo" ? 16 : 24,
        ar_over_60_days: Math.round(revenue * 0.06),
        revenue_per_employee: Math.round(revenue / account.employees),
      },
      vendor_metrics: {
        active_vendors: Math.round(account.employees * 1.8),
        top_vendor_spend_percent: 15,
        subscriptions: Math.round(account.employees * 240),
      },
      industry_metrics: {
        industry_type: account.industry,
        package_capabilities: account.demonstrates,
        forecast_confidence: index > 8 ? "Moderate" : "High",
      },
      forecast_data: {
        next_month_revenue: Math.round(revenue * 1.035),
        next_month_cash: Math.round(cash + revenue * 0.04),
        quarter_end_revenue: Math.round(revenue * 3.08),
        year_end_revenue: account.annualRevenue,
      },
      generated_forecasts: [{ type: "Pulse Predict", revenue_forecast: Math.round(revenue * 1.035), confidence: "High" }],
      generated_reports: [{ type: "Weekly Pulse Brief", status: "generated" }, { type: "Executive Package", status: "generated" }],
      source_metadata: { seed: "tier_demo_environment", company_name: account.company, plan: account.plan },
    };
  });
}

function buildInsights(account, userId) {
  const base = [
    ["Payroll", "risk", "medium", "Payroll expense is increasing faster than revenue growth.", 87000, "Review overtime and staffing efficiency.", "worsened"],
    ["Cash Flow", "risk", "medium", "Cash runway is sensitive to slower collections.", 62000, "Prioritize AR follow-up and update the 13-week cash forecast.", "stable"],
    ["Accounts Receivable", "opportunity", "low", "Collections improvement can release working capital.", 48000, "Create a weekly collections review for accounts over 45 days.", "improved"],
    ["Gross Margin", "risk", "high", "Gross margin compression is reducing EBITDA leverage.", 127000, "Review pricing, vendor costs, and job-level margin leakage.", "worsened"],
  ];

  return base.map(([category, type, severity, description, impact, action, trend], index) => ({
    company_id: account.companyId,
    user_id: userId,
    date_identified: monthDate(4 - index),
    insight_category: category,
    insight_type: type,
    severity,
    description,
    financial_impact: impact,
    financial_impact_label: `$${Number(impact).toLocaleString()} estimated annual impact`,
    recommended_action: action,
    status: index === 2 ? "in_progress" : "open",
    current_trend: trend,
    follow_up_notes:
      index === 0
        ? "First identified in March 2026 when payroll was growing 5 points faster than revenue. Current gap is 9 points, so the issue has worsened over 90 days."
        : "Pulse will continue comparing the original recommendation to current month results.",
    source_type: "seeded_demo",
    source_reference: { plan: account.plan, demonstrates: account.demonstrates },
  }));
}

async function seedAccount(supabaseAdmin, account) {
  const existingUser = await findUserByEmail(supabaseAdmin, account.email);
  const authPayload = {
    password: DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: {
      role: "customer",
      internal_admin: false,
      subscription_plan: account.plan,
      subscription_status: "active",
    },
    user_metadata: {
      role: "customer",
      company: account.company,
      subscription_plan: account.plan,
      subscription_status: "active",
      demo_environment: true,
    },
  };

  const { data, error } = existingUser
    ? await supabaseAdmin.auth.admin.updateUserById(existingUser.id, authPayload)
    : await supabaseAdmin.auth.admin.createUser({ email: account.email, ...authPayload });
  if (error) throw error;
  const user = data.user;

  const profile = await supabaseAdmin.from("users").upsert(
    {
      id: user.id,
      email: account.email,
      business_name: account.company,
      trial_used: true,
      subscription_status: "active",
    },
    { onConflict: "id" },
  );
  if (profile.error) console.warn(`[seed-demo-environments] users upsert skipped for ${account.email}: ${profile.error.message}`);

  const company = await supabaseAdmin.from("companies").upsert({
    id: account.companyId,
    name: account.company,
    industry: account.industry,
    industry_type: account.industry,
    revenue_range: account.annualRevenue < 1000000 ? "Under $1M" : account.annualRevenue < 5000000 ? "$1M-$5M" : "$5M+",
    employee_count: account.employees,
    accounting_system: "QuickBooks Online",
    reporting_cadence: account.plan === "pulse_starter" ? "Weekly" : "Monthly",
    primary_persona: account.plan === "advisacor_professional" ? "advisor-firm" : "business-owner",
    package_level: account.plan,
    billing_status: "active",
    onboarding_status: "complete",
    is_demo: true,
    updated_at: new Date().toISOString(),
  });
  if (company.error) console.warn(`[seed-demo-environments] companies upsert skipped for ${account.company}: ${company.error.message}`);

  const companyUser = await supabaseAdmin.from("company_users").upsert(
    { company_id: account.companyId, user_id: user.id, role: "company_admin", status: "active", invited_by: user.id },
    { onConflict: "company_id,user_id" },
  );
  if (companyUser.error) console.warn(`[seed-demo-environments] company_users upsert skipped for ${account.email}: ${companyUser.error.message}`);

  await supabaseAdmin.from("pulse_historical_snapshots").delete().eq("company_id", account.companyId);
  const snapshots = await supabaseAdmin.from("pulse_historical_snapshots").insert(buildSnapshots(account, user.id));
  if (snapshots.error) throw snapshots.error;

  await supabaseAdmin.from("pulse_conversation_memory").delete().eq("company_id", account.companyId);
  const conversations = await supabaseAdmin.from("pulse_conversation_memory").insert([
    {
      company_id: account.companyId,
      user_id: user.id,
      question: "What concerns you most?",
      response: "Pulse is monitoring payroll growth, cash conversion, and margin compression based on prior recommendations.",
      intent: "executive_concern",
      source_context: { seed: "tier_demo_environment", plan: account.plan },
    },
    {
      company_id: account.companyId,
      user_id: user.id,
      question: "What changed since last month?",
      response: "Revenue improved, but payroll and gross margin remain the areas that require follow-up.",
      intent: "monthly_change",
      source_context: { seed: "tier_demo_environment", plan: account.plan },
    },
  ]);
  if (conversations.error) throw conversations.error;

  await supabaseAdmin.from("pulse_insight_memory").delete().eq("company_id", account.companyId);
  const insights = await supabaseAdmin.from("pulse_insight_memory").insert(buildInsights(account, user.id));
  if (insights.error) {
    throw new Error(`${insights.error.message}. Run supabase/migrations/20260531_create_pulse_insight_memory.sql before seeding demo environments.`);
  }

  console.log(`${account.email}: ${account.company} / ${account.plan} / ${account.industry}`);
}

async function seedDemoEnvironments() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials.");

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const account of demoAccounts) {
    await seedAccount(supabaseAdmin, account);
  }

  console.log(`[seed-demo-environments] Seeded ${demoAccounts.length} demo environments.`);
  console.log(`[seed-demo-environments] Demo password: ${process.env.DEMO_CUSTOMER_PASSWORD ? "from DEMO_CUSTOMER_PASSWORD" : DEMO_PASSWORD}`);
}

seedDemoEnvironments().catch((error) => {
  console.error("[seed-demo-environments] Failed:", error?.message || error);
  process.exitCode = 1;
});
