/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

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

const firmId = "51111111-1111-4111-8111-111111111111";
const fallbackAdvisorUserId = "61111111-1111-4111-8111-111111111111";
const superAdminEmail = "mwiseman@advisacor.com";

async function findUserByEmail(supabaseAdmin, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data?.users || data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

const clients = [
  {
    id: "71111111-1111-4111-8111-111111111111",
    name: "Northstar Manufacturing",
    group_name: "Manufacturing",
    package_level: "Virtual CFO",
    health_status: "Moderate Review",
    health_score: 78,
    missing_reports: [],
    risk_level: "Medium",
    cadence: "weekly",
    status: "Pending Approval",
    briefing_id: "81111111-1111-4111-8111-111111111111",
  },
  {
    id: "71111111-1111-4111-8111-222222222222",
    name: "Summit Construction Group",
    group_name: "Construction",
    package_level: "Professional",
    health_status: "Needs Attention",
    health_score: 63,
    missing_reports: ["Inventory Report"],
    risk_level: "High",
    cadence: "bi-weekly",
    status: "Draft",
    briefing_id: "81111111-1111-4111-8111-222222222222",
  },
  {
    id: "71111111-1111-4111-8111-333333333333",
    name: "Harbor Healthcare Services",
    group_name: "Healthcare",
    package_level: "Essential",
    health_status: "Moderate Review",
    health_score: 74,
    missing_reports: ["FTE Report"],
    risk_level: "Medium",
    cadence: "monthly",
    status: "Sent",
    briefing_id: "81111111-1111-4111-8111-333333333333",
  },
  {
    id: "71111111-1111-4111-8111-444444444444",
    name: "Brightline Professional Services",
    group_name: "Professional Services",
    package_level: "Virtual CFO",
    health_status: "Healthy",
    health_score: 88,
    missing_reports: ["Inventory Report"],
    risk_level: "Low",
    cadence: "weekly",
    status: "Approved",
    briefing_id: "81111111-1111-4111-8111-444444444444",
  },
];

function buildClientContent(client) {
  return {
    executiveSummary: `${client.name} has a CFO-style briefing ready for owner review. Revenue, cash, receivables, payables, payroll, and risk items were summarized in plain English.`,
    revenue: "Revenue movement was analyzed against the prior period and translated into business-owner language.",
    cash: "Cash movement was reviewed against customer collections, payroll, and vendor payments.",
    profitability: "Profitability movement was reviewed with attention to gross margin and operating expense changes.",
    receivables: "Accounts receivable aging was reviewed for balances that may create short-term cash pressure.",
    payables: "Accounts payable timing was reviewed against available cash and expected receipts.",
    payroll: "Payroll and FTE movement were reviewed for labor cost changes.",
    inventory: client.group_name === "Manufacturing" ? "Inventory movement was reviewed for carrying-cost and margin implications." : "Inventory was not a primary operating driver for this client.",
    risks: `${client.risk_level} risk based on available financial movement and missing data.`,
    recommendedActions: [
      "Review the largest AR balances before the next client call.",
      "Confirm cash availability for the next payroll and vendor cycle.",
      "Use this briefing as the discussion agenda for the next owner check-in.",
    ],
    missingDataNotice: client.missing_reports.length
      ? client.missing_reports.map((report) => `Limited insight available because ${report} was not provided.`)
      : ["All critical reports were available for this briefing."],
  };
}

function buildAdvisorContent(client) {
  return {
    revenueVariance: "Revenue variance reviewed against prior period.",
    grossMarginVariance: "Gross margin variance reviewed for pricing, labor, and cost pressure.",
    ebitdaVariance: "EBITDA/profit movement reviewed for advisor discussion.",
    cashMovementByDriver: "Cash movement reviewed across collections, payroll, and vendor payments.",
    arAgingChanges: "AR aging changes reviewed with emphasis on over-60-day exposure.",
    apAgingChanges: "AP aging changes reviewed for short-term cash planning.",
    payrollFteTrends: "Payroll and FTE movement reviewed for staffing efficiency.",
    inventoryMovement: "Inventory movement reviewed where applicable.",
    budgetVsActual: "Budget vs actual reviewed where budget data was available.",
    kpiExceptions: client.risk_level === "High" ? ["Cash decline", "Rising AR", "Margin pressure"] : ["Monitor AR and payroll timing"],
    riskFlags: client.risk_level === "High" ? ["declining_cash", "rising_ar", "margin_decline"] : ["monitoring_required"],
    suggestedTalkingPoints: [
      "Ask whether revenue movement reflects timing or demand.",
      "Confirm owner follow-up on aged receivables.",
      "Discuss near-term cash needs and vendor timing.",
    ],
  };
}

async function seedClientBriefings() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const superAdminUser = await findUserByEmail(supabaseAdmin, superAdminEmail);
  const advisorUserId = superAdminUser?.id || fallbackAdvisorUserId;

  const { error: firmError } = await supabaseAdmin.from("firms").upsert({
    id: firmId,
    name: "Advisacor Demo Advisory",
    advisor_name: "Morgan Ellis, Fractional CFO",
    reply_to_email: "advisor@advisacor.com",
    footer_disclaimer: "For management discussion only. Review with your advisor before making material financial decisions.",
    custom_intro_message: "Every client gets a CFO-style briefing at the cadence the firm chooses.",
    owner_user_id: advisorUserId,
    is_demo: true,
    updated_at: new Date().toISOString(),
  });
  if (firmError) throw firmError;

  const { error: membershipError } = await supabaseAdmin
    .from("firm_memberships")
    .upsert(
      {
        firm_id: firmId,
        user_id: advisorUserId,
        role: "firm_admin",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "firm_id,user_id" },
    );
  if (membershipError) throw membershipError;

  for (const client of clients) {
    const { data: existingBriefings, error: existingBriefingsError } = await supabaseAdmin
      .from("client_briefings")
      .select("id")
      .eq("client_id", client.id);
    if (existingBriefingsError) throw existingBriefingsError;

    for (const briefing of existingBriefings || []) {
      if (briefing.id !== client.briefing_id) {
        const { error: deleteOldBriefingError } = await supabaseAdmin.from("client_briefings").delete().eq("id", briefing.id);
        if (deleteOldBriefingError) throw deleteOldBriefingError;
      }
    }

    const { error: clientError } = await supabaseAdmin.from("firm_clients").upsert({
      id: client.id,
      firm_id: firmId,
      name: client.name,
      group_name: client.group_name,
      package_level: client.package_level,
      subscription_status: "active",
      health_status: client.health_status,
      health_score: client.health_score,
      last_package_generated: "May 2026",
      last_login: "This week",
      outstanding_review_items: client.risk_level === "High" ? 3 : client.risk_level === "Medium" ? 1 : 0,
      upcoming_deliveries: 1,
      weekly_brief_status: "Scheduled",
      monthly_package_status: "Scheduled",
      quarterly_review_status: client.package_level === "Virtual CFO" ? "Scheduled" : "Skipped",
      owner_visibility_restricted: true,
      review_items: client.risk_level === "High" ? ["Cash decline", "AR aging increase", "Margin pressure"] : [],
      persona_views: ["Bookkeeper View", "Controller View", "Fractional CFO View", "Owner View"],
      is_demo: true,
      updated_at: new Date().toISOString(),
    });
    if (clientError) throw clientError;

    const { error: settingsError } = await supabaseAdmin
      .from("client_briefing_settings")
      .upsert(
        {
          firm_id: firmId,
          client_id: client.id,
          cadence: client.cadence,
          day_of_week: client.cadence === "monthly" ? "First Friday" : "Friday",
          delivery_time: "08:00",
          timezone: "America/New_York",
          delivery_method: "both",
          approval_required: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "firm_id,client_id" },
      );
    if (settingsError) throw settingsError;

    const { data: briefing, error: briefingError } = await supabaseAdmin
      .from("client_briefings")
      .upsert({
        id: client.briefing_id,
        firm_id: firmId,
        client_id: client.id,
        period_start: "2026-05-01",
        period_end: "2026-05-29",
        briefing_type: "both",
        status: client.status,
        client_briefing_content: buildClientContent(client),
        advisor_briefing_content: buildAdvisorContent(client),
        missing_reports: client.missing_reports,
        risk_level: client.risk_level,
        generated_at: new Date().toISOString(),
        approved_at: ["Approved", "Sent"].includes(client.status) ? new Date().toISOString() : null,
        sent_at: client.status === "Sent" ? new Date().toISOString() : null,
        created_by: advisorUserId,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .limit(1);
    if (briefingError) throw briefingError;

    const briefingId = briefing?.[0]?.id;
    if (briefingId) {
      await supabaseAdmin.from("client_briefing_events").delete().eq("briefing_id", briefingId).eq("event_type", "seeded");

      const { error: eventError } = await supabaseAdmin.from("client_briefing_events").insert({
        briefing_id: briefingId,
        event_type: "seeded",
        event_description: "Demo client briefing seeded for local testing.",
        created_by: advisorUserId,
      });
      if (eventError) throw eventError;
    }
  }

  console.log(`Seeded Client Briefings demo firm and ${clients.length} clients.`);
  console.log(`Firm admin membership assigned to: ${superAdminUser?.email || "fallback demo user id"}`);
  console.log("Use the Client Briefings dashboard to test settings, approval, send, and regeneration flows.");
}

seedClientBriefings().catch((error) => {
  console.error("Unable to seed Client Briefings demo data.");
  console.error(`Error code: ${error.code || "none"}`);
  console.error(`Error message: ${error.message}`);
  console.error("Next step: run supabase/migrations/20260530_create_client_briefings.sql in Supabase SQL Editor, then rerun npm run seed:client-briefings.");
  process.exitCode = 1;
});
