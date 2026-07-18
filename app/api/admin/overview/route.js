import { NextResponse } from "next/server";
import {
  normalizeDemoCompany,
  superAdminDemoCompanies,
  superAdminDemoJobs,
  superAdminCapabilities,
  getSuperAdminPackageLevels,
  getSuperAdminPackageGroups,
  superAdminPersonaModes,
  superAdminScreens,
} from "../../../../lib/super-admin";
import { auditSuperAdminEvent, resolveSuperAdminAccess } from "../../../../lib/super-admin-security";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "admin-overview", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from("companies")
    .select("id, name, industry, industry_type, package_level, primary_persona, accounting_system, reporting_cadence, onboarding_status, is_demo, created_at, updated_at")
    .eq("is_demo", true)
    .order("name", { ascending: true });

  let demoCompanies =
    companiesError?.code === "42P01" || companiesError
      ? superAdminDemoCompanies
      : (companies || []).map(normalizeDemoCompany);

  if (!companiesError && companies?.length) {
    const companyIds = companies.map((company) => company.id);
    const [{ data: companyUsers }, { data: invitations }, { data: deliverySettings }] = await Promise.all([
      supabaseAdmin
        .from("company_users")
        .select("company_id, user_id, role, status, created_at")
        .in("company_id", companyIds),
      supabaseAdmin
        .from("company_invitations")
        .select("company_id, email, role, status, created_at")
        .in("company_id", companyIds),
      supabaseAdmin
        .from("delivery_settings")
        .select("company_id, weekly_brief_enabled, monthly_package_enabled, quarterly_review_enabled, recipient_emails, approval_required, auto_send_enabled")
        .in("company_id", companyIds),
    ]);

    demoCompanies = demoCompanies.map((company) => {
      const settings = (deliverySettings || []).find((item) => item.company_id === company.id);
      const users = [
        ...(companyUsers || [])
          .filter((user) => user.company_id === company.id)
          .map((user) => ({ email: user.user_id, role: user.role, status: user.status })),
        ...(invitations || [])
          .filter((invitation) => invitation.company_id === company.id)
          .map((invitation) => ({ email: invitation.email, role: invitation.role, status: invitation.status })),
      ];
      const uniqueUsers = Array.from(
        new Map(users.map((user) => [`${user.email}-${user.role}-${user.status}`, user])).values(),
      );

      return {
        ...company,
        users: uniqueUsers,
        deliverySettings: settings || {},
      };
    });
  }
  const resolvedDemoCompanies = demoCompanies.length ? demoCompanies : superAdminDemoCompanies;

  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from("background_jobs")
    .select("id, job_type, status, company_id, created_at, updated_at, error_message")
    .order("created_at", { ascending: false })
    .limit(25);

  const { data: auditLogs, error: auditLogsError } = await supabaseAdmin
    .from("audit_logs")
    .select("id, event_type, actor_user_id, actor_email, company_id, created_at, metadata")
    .like("event_type", "super_admin_%")
    .order("created_at", { ascending: false })
    .limit(50);

  const resolvedJobs = jobsError ? superAdminDemoJobs : jobs || [];

  await auditSuperAdminEvent({
    eventType: "overview_opened",
    actorUserId: access.userId,
    actorEmail: access.email,
  });

  return NextResponse.json({
    admin: {
      email: access.email,
      role: access.role,
    },
    screens: superAdminScreens,
    capabilities: superAdminCapabilities,
    persona_modes: superAdminPersonaModes,
    package_levels: getSuperAdminPackageLevels(),
    package_groups: getSuperAdminPackageGroups(),
    demo_companies: resolvedDemoCompanies,
    jobs: resolvedJobs,
    failed_jobs: resolvedJobs.filter((job) => String(job.status || "").toLowerCase() === "failed"),
    audit_logs: auditLogsError ? [] : auditLogs || [],
    system_health: {
      supabase_configured: Boolean(supabaseAdmin),
      demo_company_storage_configured: true,
      demo_fixtures_available: true,
      job_storage_configured: true,
      job_queue_configured: true,
      background_jobs_configured: true,
      background_jobs_table_configured: !jobsError,
      audit_log_storage_configured: !auditLogsError,
      allowlist_configured: Boolean(process.env.SUPER_ADMIN_EMAILS || process.env.INTERNAL_ADMIN_EMAILS),
    },
    job_storage: {
      provider: jobsError ? "internal_demo_job_storage" : "supabase_background_jobs",
      supports: [
        "PDF generation",
        "PowerPoint generation",
        "Weekly Executive Briefs",
        "Monthly Executive Packages",
        "AI commentary generation",
        "Forecast generation",
        "Oversight review jobs",
      ],
      trigger_dev_configured: Boolean(process.env.TRIGGER_SECRET_KEY || process.env.TRIGGER_API_KEY),
      production_setup_missing: jobsError ? "Create the Supabase background_jobs table and connect a production queue provider such as Trigger.dev." : null,
    },
  });
}
