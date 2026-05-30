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

const healthcareDemoCompanyId = "11111111-1111-4111-8111-333333333333";

const healthcareOperationalStats = [
  {
    company_id: healthcareDemoCompanyId,
    period_type: "month",
    period_label: "Mar 2026",
    period_start: "2026-03-01",
    period_end: "2026-03-31",
    patient_days: 2720,
    total_revenue: 1357280,
    total_operating_expenses: 1060800,
    payroll_expense: 585000,
    medical_supplies_expense: 151000,
    contract_labor_expense: 94000,
    input_source: "imported_operational_statistics",
    import_batch_id: "healthcare-demo-mar-2026",
  },
  {
    company_id: healthcareDemoCompanyId,
    period_type: "month",
    period_label: "Apr 2026",
    period_start: "2026-04-01",
    period_end: "2026-04-30",
    patient_days: 2785,
    total_revenue: 1412000,
    total_operating_expenses: 1102860,
    payroll_expense: 612000,
    medical_supplies_expense: 158000,
    contract_labor_expense: 102000,
    input_source: "uploaded_census_data",
    census_file_name: "healthcare-demo-census-apr-2026.csv",
  },
  {
    company_id: healthcareDemoCompanyId,
    period_type: "month",
    period_label: "May 2026",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    patient_days: 2810,
    total_revenue: 1483680,
    total_operating_expenses: 1138050,
    payroll_expense: 636000,
    medical_supplies_expense: 166000,
    contract_labor_expense: 112000,
    input_source: "manual",
  },
];

function perPatientDay(numerator, patientDays) {
  return numerator / patientDays;
}

async function seedHealthcareOperationalStats() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id, name, industry_type")
    .eq("id", healthcareDemoCompanyId)
    .maybeSingle();

  if (companyError) throw companyError;
  if (!company) throw new Error("Healthcare Demo Company was not found. Run npm run seed:company-accounts first.");
  if (company.industry_type !== "Healthcare") {
    throw new Error(`Healthcare Demo Company industry_type must be Healthcare. Current value: ${company.industry_type || "blank"}`);
  }

  const { data, error } = await supabaseAdmin
    .from("healthcare_operational_stats")
    .upsert(healthcareOperationalStats, { onConflict: "company_id,period_type,period_label" })
    .select("period_label, patient_days, total_revenue, total_operating_expenses, payroll_expense, contract_labor_expense, medical_supplies_expense");

  if (error) throw error;

  console.log(`Seeded healthcare_operational_stats rows: ${data.length}`);
  data.forEach((row) => {
    console.log(
      `${row.period_label}: revenue/PD $${perPatientDay(row.total_revenue, row.patient_days).toFixed(0)}, expense/PD $${perPatientDay(row.total_operating_expenses, row.patient_days).toFixed(0)}, labor/PD $${perPatientDay(row.payroll_expense, row.patient_days).toFixed(0)}, contract labor/PD $${perPatientDay(row.contract_labor_expense, row.patient_days).toFixed(0)}`,
    );
  });
}

seedHealthcareOperationalStats().catch((error) => {
  console.error("Unable to seed healthcare operational stats.");
  console.error(`Error code: ${error.code || "none"}`);
  console.error(`Error message: ${error.message}`);
  console.error("Next step: confirm supabase/migrations/20260530_create_healthcare_operational_stats.sql has run, then rerun npm run seed:healthcare-operational-stats.");
  process.exitCode = 1;
});
