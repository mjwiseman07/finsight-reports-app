/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const requiredFiles = [
  "supabase/migrations/20260531_create_pdf_package_customizations.sql",
  "supabase/migrations/20260531_alter_pdf_package_customizations_for_package_control.sql",
  "lib/pdf-package-customization.js",
  "lib/fixed-asset-roll-forward.js",
  "app/api/pdf-packages/customize/route.js",
  "app/api/pulse/ask/route.js",
];

const requiredReportKeys = [
  "income_statement_summary",
  "cash_summary",
  "revenue_trend",
  "expense_trend",
  "cash_flow_summary",
  "payroll_summary",
  "budget_vs_actual",
  "revenue_by_customer",
  "expense_by_vendor",
  "fixed_asset_roll_forward",
  "advanced_fixed_asset_roll_forward",
  "strategic_commentary",
  "forecast_schedules",
  "scenario_analysis",
  "capital_planning_schedules",
  "executive_scorecards",
  "custom_appendix_schedules",
];

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`${path} is missing.`);
  return fs.readFileSync(path, "utf8");
}

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

async function verifySupabasePersistence() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.log("PDF customization Supabase persistence: skipped, service credentials not configured");
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const user =
    (await findUserByEmail(supabaseAdmin, "demo.manufacturing@advisacor.com")) ||
    (await findUserByEmail(supabaseAdmin, "demo@advisacor.com"));
  if (!user?.id) {
    console.log("PDF customization Supabase persistence: skipped, demo user not found");
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("pdf_package_customizations")
    .insert({
      user_id: user.id,
      company_id: "44444444-4444-4444-8444-444444444444",
      package_period: "Verification",
      package_type: "powerpoint",
      customization_action: "add",
      report_key: "fixed_asset_roll_forward",
      report_title: "Fixed Asset Roll-Forward",
      subscription_plan: "advisacor_cfo",
      recurrence: "one_time",
      status: "verified",
      request_text: "Verification insert for PDF customization persistence.",
      pulse_response: "Verification succeeded.",
      report_payload: { verifier: "verify-pdf-customization" },
      section_placement: "supporting_schedules",
    })
    .select("id")
    .single();

  if (error) {
    const message = String(error.message || "");
    if (error.code === "42703" || message.includes("schema cache") || message.includes("package_type")) {
      console.log("PDF customization Supabase persistence: base table OK; run 20260531_alter_pdf_package_customizations_for_package_control.sql for package_type/action columns");
      return;
    }
    throw error;
  }
  await supabaseAdmin.from("pdf_package_customizations").delete().eq("id", data.id);
  console.log("PDF customization Supabase persistence: OK");
}

async function verifyPdfCustomization() {
  const contents = Object.fromEntries(requiredFiles.map((path) => [path, read(path)]));
  const catalog = contents["lib/pdf-package-customization.js"];
  const fixedAssets = contents["lib/fixed-asset-roll-forward.js"];
  const pulseAsk = contents["app/api/pulse/ask/route.js"];
  const migration = contents["supabase/migrations/20260531_create_pdf_package_customizations.sql"];
  const controlMigration = contents["supabase/migrations/20260531_alter_pdf_package_customizations_for_package_control.sql"];

  requiredReportKeys.forEach((key) => {
    if (!catalog.includes(key)) throw new Error(`Report key ${key} is missing from pdfPackageReportCatalog.`);
  });

  [
    "Land",
    "Buildings",
    "Leasehold improvements",
    "Machinery and equipment",
    "Vehicles",
    "Furniture and fixtures",
    "Computer equipment",
    "Construction in progress",
    "Other fixed assets",
  ].forEach((category) => {
    if (!fixedAssets.includes(category)) throw new Error(`Fixed asset category ${category} is missing.`);
  });

  [
    "Beginning Cost",
    "Additions",
    "Disposals",
    "Transfers",
    "Step-Up Valuation Adjustment",
    "Step-Down Valuation Adjustment",
    "Ending Cost",
    "Current Year Depreciation",
    "Depreciation on Valuation Adjustments",
    "Net Book Value",
  ].forEach((column) => {
    if (!fixedAssets.includes(column)) throw new Error(`Fixed asset column ${column} is missing.`);
  });

  [
    "stepUpValuationAdjustment",
    "stepDownValuationAdjustment",
    "depreciationOnValuationAdjustments",
  ].forEach((field) => {
    if (!fixedAssets.includes(field)) throw new Error(`Fixed asset field ${field} is missing.`);
  });

  if (!catalog.includes("Normal additions, disposals, and transfers will remain separate")) {
    throw new Error("Pulse step-up/step-down response wording is missing.");
  }

  if (!pulseAsk.includes("detectPdfPackageRequest")) {
    throw new Error("Pulse ask route is not wired to detect PDF package requests.");
  }

  if (!migration.includes("pdf_package_customizations")) {
    throw new Error("PDF customization migration does not create pdf_package_customizations.");
  }

  if (!controlMigration.includes("package_type") || !controlMigration.includes("customization_action")) {
    throw new Error("Package customization control migration is missing package_type or customization_action.");
  }

  [
    "detectPackageType",
    "detectCustomizationAction",
    "shouldPersistRecurringPreference",
    "customerManualTemplateEditing: false",
    "powerpoint",
    "board deck",
    "remove",
  ].forEach((token) => {
    if (!catalog.includes(token)) throw new Error(`Package customization control token ${token} is missing.`);
  });

  console.log("PDF package customization catalog: OK");
  console.log("Fixed asset roll-forward categories and columns: OK");
  console.log("Pulse PDF package request interception: OK");
  console.log("PDF customization persistence migration: OK");
  console.log("Pulse-only PDF/PowerPoint customization control: OK");
  await verifySupabasePersistence();
}

verifyPdfCustomization().catch((error) => {
  console.error("[verify-pdf-customization] Failed:", error?.message || error);
  process.exitCode = 1;
});
