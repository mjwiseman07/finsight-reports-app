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

const demoCompanies = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Manufacturing Demo Company",
    industry: "Precision manufacturing",
    industry_type: "Manufacturing",
    primary_persona: "business-owner",
    package_level: "virtual-cfo",
    accounting_system: "QuickBooks",
    reporting_cadence: "Weekly",
    adminUserId: "21111111-1111-4111-8111-111111111111",
    adminEmail: "owner.admin+manufacturing@advisacor.com",
    extraEmail: "owner.exec+manufacturing@advisacor.com",
    extraRole: "owner_executive",
  },
  {
    id: "11111111-1111-4111-8111-222222222222",
    name: "Construction Demo Company",
    industry: "Commercial construction",
    industry_type: "Construction",
    primary_persona: "controller",
    package_level: "professional",
    accounting_system: "Sage",
    reporting_cadence: "Monthly",
    adminUserId: "21111111-1111-4111-8111-222222222222",
    adminEmail: "controller.admin+construction@advisacor.com",
    extraEmail: "controller+construction@advisacor.com",
    extraRole: "controller",
  },
  {
    id: "11111111-1111-4111-8111-333333333333",
    name: "Healthcare Demo Company",
    industry: "Healthcare services",
    industry_type: "Healthcare",
    primary_persona: "bookkeeper",
    package_level: "essential",
    accounting_system: "Manual Financial Upload",
    reporting_cadence: "Monthly",
    adminUserId: "21111111-1111-4111-8111-333333333333",
    adminEmail: "bookkeeper.admin+healthcare@advisacor.com",
    extraEmail: "bookkeeper+healthcare@advisacor.com",
    extraRole: "bookkeeper",
  },
  {
    id: "11111111-1111-4111-8111-444444444444",
    name: "Professional Services Demo Company",
    industry: "Professional services",
    industry_type: "Professional Services",
    primary_persona: "fractional-cfo",
    package_level: "virtual-cfo",
    accounting_system: "QuickBooks",
    reporting_cadence: "Weekly",
    adminUserId: "21111111-1111-4111-8111-444444444444",
    adminEmail: "advisor.admin+professionalservices@advisacor.com",
    extraEmail: "advisor+professionalservices@advisacor.com",
    extraRole: "advisor_fractional_cfo",
  },
];

async function seedCompanyAccounts() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const company of demoCompanies) {
    const { error: companyError } = await supabaseAdmin.from("companies").upsert({
      id: company.id,
      name: company.name,
      industry: company.industry,
      industry_type: company.industry_type,
      revenue_range: "$5M-$25M",
      employee_count: 25,
      accounting_system: company.accounting_system,
      reporting_cadence: company.reporting_cadence,
      primary_persona: company.primary_persona,
      package_level: company.package_level,
      billing_status: "trial",
      onboarding_status: "complete",
      is_demo: true,
      updated_at: new Date().toISOString(),
    });

    if (companyError) throw companyError;

    await supabaseAdmin.from("company_users").upsert({
      company_id: company.id,
      user_id: company.adminUserId,
      role: "company_admin",
      status: "active",
      invited_by: company.adminUserId,
    });

    await supabaseAdmin.from("company_invitations").upsert({
      company_id: company.id,
      email: company.extraEmail,
      role: company.extraRole,
      status: "pending",
      invited_by: company.adminUserId,
    });

    await supabaseAdmin.from("delivery_settings").upsert({
      company_id: company.id,
      weekly_brief_enabled: true,
      monthly_package_enabled: true,
      quarterly_review_enabled: company.package_level === "virtual-cfo",
      recipient_emails: [company.adminEmail, company.extraEmail],
      approval_required: true,
      auto_send_enabled: false,
    });

    await supabaseAdmin.from("onboarding_progress").upsert({
      company_id: company.id,
      status: "complete",
      completed_steps: ["company_information", "primary_use_case", "package_selection", "data_source", "delivery_settings", "invite_users"],
      started_by: company.adminUserId,
      completed_at: new Date().toISOString(),
    });
  }

  console.log(`Seeded company account demo companies: ${demoCompanies.length}`);
  demoCompanies.forEach((company) => console.log(`${company.name}: ${company.primary_persona} / ${company.package_level}`));
}

seedCompanyAccounts().catch((error) => {
  console.error("Unable to seed company account demo data.");
  console.error(`Error code: ${error.code || "none"}`);
  console.error(`Error message: ${error.message}`);
  console.error("Next step: run supabase/migrations/20260530_create_company_accounts.sql in Supabase SQL Editor, then rerun npm run seed:company-accounts.");
  process.exitCode = 1;
});
