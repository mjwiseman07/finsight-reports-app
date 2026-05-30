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

function buildJob(jobType, companyId, personaMode, packageLevel, status, metadata = {}, errorMessage = null) {
  return {
    job_type: jobType,
    status,
    company_id: companyId,
    persona_mode: personaMode,
    package_level: packageLevel,
    metadata,
    error_message: errorMessage,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function buildInitialBackgroundJobs() {
  return [
    buildJob("PDF generation", "demo-manufacturing", "Business Owner", "Virtual CFO", "Scheduled", { source: "super_admin_seed" }),
    buildJob("PowerPoint generation", "demo-construction", "Controller", "Professional", "Queued", { source: "super_admin_seed" }),
    buildJob("Weekly Executive Brief", "demo-healthcare", "Bookkeeper", "Essential", "Processing", { source: "super_admin_seed" }),
    buildJob("Monthly Executive Package", "demo-professional-services", "Fractional CFO", "Virtual CFO", "Awaiting Approval", { source: "super_admin_seed" }),
    buildJob("AI Commentary Generation", "demo-manufacturing", "Business Owner", "Virtual CFO", "Sent", { source: "super_admin_seed" }),
    buildJob("Forecast Generation", "demo-construction", "Controller", "Professional", "Scheduled", { source: "super_admin_seed" }),
    buildJob(
      "Oversight Review",
      "demo-professional-services",
      "Fractional CFO",
      "Virtual CFO",
      "Failed",
      { source: "super_admin_seed", demo_failure: true },
      "Demo failure for failed-job visibility testing.",
    ),
  ];
}

async function seedBackgroundJobs() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const jobs = buildInitialBackgroundJobs();
  const { data, error } = await supabaseAdmin
    .from("background_jobs")
    .insert(jobs)
    .select("id, job_type, status, company_id, created_at");

  if (error) {
    console.error("Unable to seed background_jobs.");
    console.error(`Error code: ${error.code || "none"}`);
    console.error(`Error message: ${error.message}`);
    console.error("Next step: run supabase/migrations/20260529_create_background_jobs.sql in the Supabase SQL Editor, then rerun npm run seed:background-jobs.");
    process.exitCode = 1;
    return;
  }

  console.log(`Seeded background_jobs rows: ${data.length}`);
  data.forEach((job) => {
    console.log(`${job.job_type}: ${job.status}`);
  });
}

seedBackgroundJobs().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
