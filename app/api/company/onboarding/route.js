import { NextResponse } from "next/server";
import {
  accountingSystemOptions,
  accountingReportCatalog,
  accountTypeOptions,
  advisoryServiceOptions,
  clientCountOptions,
  companyOnboardingStatuses,
  companyPackageOptions,
  companyPersonaOptions,
  companyRoleDefinitions,
  connectedAccountingSystemOptions,
  getIndustryIntelligenceProfile,
  getNextOnboardingStatus,
  industryTypeOptions,
  manualFinancialUploadReports,
  normalizeCompanyAccount,
  practiceStructureOptions,
  reportingCadenceOptions,
  revenueRangeOptions,
} from "../../../../lib/company-account";
import { getAuthenticatedCompanyUser } from "../../../../lib/company-security";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import { auditSecurityEvent } from "../../../../lib/security-audit";

function normalizeEmailList(value) {
  if (Array.isArray(value)) return value.map((email) => String(email).trim().toLowerCase()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim();
  return companyRoleDefinitions.some((definition) => definition.role === normalizedRole) ? normalizedRole : "viewer";
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "company-onboarding-options", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json({
    statuses: companyOnboardingStatuses,
    account_types: accountTypeOptions,
    practice_structures: practiceStructureOptions,
    client_counts: clientCountOptions,
    advisory_services: advisoryServiceOptions,
    industry_types: industryTypeOptions,
    personas: companyPersonaOptions,
    packages: companyPackageOptions,
    roles: companyRoleDefinitions,
    accounting_systems: accountingSystemOptions,
    connected_accounting_systems: connectedAccountingSystemOptions,
    manual_financial_upload_reports: manualFinancialUploadReports,
    accounting_report_catalog: accountingReportCatalog,
    reporting_cadences: reportingCadenceOptions,
    revenue_ranges: revenueRangeOptions,
  });
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "company-onboarding-submit", limit: 12, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const accountType = String(body.account_type || "my-own-company").trim();
  const practice = body.practice || {};
  const company = body.company || {};
  const delivery = body.delivery_settings || {};
  const invitations = Array.isArray(body.invitations) ? body.invitations : [];
  const dataSourcePath = String(body.data_source_path || "").trim();
  const manualUploads = body.manual_uploads || {};
  const reportDiscovery = body.report_discovery || {};
  const recommendedPackage = String(body.recommended_package || "").trim();
  const dataConnectionStatus = String(body.data_connection_status || "").trim();
  const firstPackageGenerated = Boolean(body.first_package_generated);

  if (!accountTypeOptions.some((option) => option.id === accountType)) {
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  }

  if (!String(company.name || "").trim()) {
    return NextResponse.json({ error: accountType === "my-own-company" ? "Company name is required." : "Client company name is required." }, { status: 400 });
  }

  if (!["connected", "upload_configured"].includes(dataConnectionStatus)) {
    return NextResponse.json({ error: "Connect an accounting system or configure Manual Financial Upload before completing onboarding." }, { status: 400 });
  }

  if (!["connected", "manual_upload"].includes(dataSourcePath)) {
    return NextResponse.json({ error: "Choose either Connect Accounting System or Upload Financial Statements." }, { status: 400 });
  }

  if (dataSourcePath === "connected" && !connectedAccountingSystemOptions.includes(String(company.accounting_system || company.data_source || ""))) {
    return NextResponse.json({ error: "Choose a supported accounting system." }, { status: 400 });
  }

  const missingRequiredUploads = manualFinancialUploadReports
    .filter((report) => report.required)
    .some((report) => !manualUploads[report.id]);

  if (dataSourcePath === "manual_upload" && missingRequiredUploads) {
    return NextResponse.json({ error: "Balance Sheet and Income Statement are required for the manual upload report." }, { status: 400 });
  }

  if (!firstPackageGenerated) {
    return NextResponse.json({ error: "Generate the first package before completing onboarding." }, { status: 400 });
  }

  const primaryPersona = String(company.primary_persona || "business-owner");
  const packageLevel = String(company.package_level || "essential");
  const industryType = String(company.industry_type || "").trim();

  if (!industryType || !industryTypeOptions.includes(industryType)) {
    return NextResponse.json({ error: "Industry type is required." }, { status: 400 });
  }

  if (!companyPersonaOptions.some((option) => option.id === primaryPersona)) {
    return NextResponse.json({ error: "Invalid primary persona." }, { status: 400 });
  }

  if (!companyPackageOptions.some((option) => option.id === packageLevel)) {
    return NextResponse.json({ error: "Invalid package level." }, { status: 400 });
  }

  if (recommendedPackage && !companyPackageOptions.some((option) => option.id === recommendedPackage)) {
    return NextResponse.json({ error: "Invalid recommended package." }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  let practiceId = null;

  if (accountType !== "my-own-company") {
    const { data: insertedPractice, error: practiceError } = await supabaseAdmin
      .from("practice_accounts")
      .insert({
        account_type: accountType,
        name: String(practice.name || `${company.name || "Client"} Practice`).trim(),
        structure: String(practice.structure || (accountType === "bookkeeper-advisor" ? "Solo" : "Firm")),
        client_count: String(practice.client_count || ""),
        primary_services: Array.isArray(practice.primary_services) ? practice.primary_services.map(String) : [],
        default_reporting_cadence: String(practice.default_reporting_cadence || company.reporting_cadence || "").trim(),
        invite_users_now: Boolean(practice.invite_users_now),
        owner_user_id: access.user.id,
        is_demo: Boolean(body.is_demo),
      })
      .select("id")
      .single();

    if (practiceError?.code === "42P01" || practiceError?.code === "42703") {
      return NextResponse.json({ error: "Run the account type onboarding migration before submitting this onboarding path." }, { status: 501 });
    }

    if (practiceError) {
      return NextResponse.json({ error: "Unable to create practice or firm account." }, { status: 500 });
    }

    practiceId = insertedPractice.id;
  }

  const { data: insertedCompany, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({
      account_type: accountType,
      practice_id: practiceId,
      name: String(company.name).trim(),
      industry: String(company.industry || "").trim(),
      industry_type: industryType,
      revenue_range: String(company.revenue_range || "").trim(),
      employee_count: Number(company.employee_count || 0),
      accounting_system: String(dataSourcePath === "manual_upload" ? "Manual Financial Upload" : company.accounting_system || company.data_source || "").trim(),
      reporting_cadence: String(company.reporting_cadence || "").trim(),
      primary_persona: primaryPersona,
      package_level: packageLevel,
      billing_status: "trial",
      onboarding_status: getNextOnboardingStatus(5),
      is_demo: Boolean(body.is_demo),
    })
    .select("*")
    .single();

  if (companyError?.code === "42P01" || companyError?.code === "42703") {
    return NextResponse.json({ error: "Run the latest company account onboarding migrations before submitting onboarding." }, { status: 501 });
  }

  if (companyError) {
    return NextResponse.json({ error: "Unable to create company account." }, { status: 500 });
  }

  await supabaseAdmin.from("company_users").insert({
    company_id: insertedCompany.id,
    user_id: access.user.id,
    role: "company_admin",
    status: "active",
    invited_by: access.user.id,
  });

  await supabaseAdmin.from("delivery_settings").upsert({
    company_id: insertedCompany.id,
    weekly_brief_enabled: Boolean(delivery.weekly_brief_enabled),
    monthly_package_enabled: Boolean(delivery.monthly_package_enabled),
    quarterly_review_enabled: Boolean(delivery.quarterly_review_enabled),
    recipient_emails: normalizeEmailList(delivery.recipient_emails),
    approval_required: Boolean(delivery.approval_required),
    auto_send_enabled: Boolean(delivery.auto_send_enabled),
  });

  await supabaseAdmin.from("company_settings").upsert({
    company_id: insertedCompany.id,
    integrations: {
      data_source_path: dataSourcePath,
      data_source: dataSourcePath === "manual_upload" ? "Manual Financial Upload" : company.data_source || company.accounting_system,
      manual_uploads: dataSourcePath === "manual_upload" ? manualUploads : {},
      discovered_reports: {
        found: Array.isArray(reportDiscovery.found) ? reportDiscovery.found : [],
        missing: Array.isArray(reportDiscovery.missing) ? reportDiscovery.missing : [],
        catalog: accountingReportCatalog,
      },
      recommended_package: recommendedPackage || packageLevel,
      free_report_limitations:
        dataSourcePath === "manual_upload"
          ? ["Executive Summary", "KPI Review", "Sample PDF"]
          : [],
    },
    package_scope: companyPackageOptions.find((option) => option.id === packageLevel)?.scope || [],
    permissions: {
      data_connection_status: dataConnectionStatus,
      report_mode: dataSourcePath === "manual_upload" ? "free_manual_upload" : "full_connected_intelligence",
      recommended_package: recommendedPackage || packageLevel,
      first_package_generated: firstPackageGenerated,
      first_package_generated_at: new Date().toISOString(),
    },
    industry_intelligence: {
      industry_type: industryType,
      ...getIndustryIntelligenceProfile(industryType),
    },
  });

  await supabaseAdmin.from("onboarding_progress").upsert({
    company_id: insertedCompany.id,
    status: "complete",
    completed_steps: [
      "account_type",
      "company_information",
      "industry_type",
      "package_selection",
      "data_source",
      "delivery_configuration",
      "generate_first_package",
    ],
    started_by: access.user.id,
    completed_at: new Date().toISOString(),
  });

  await supabaseAdmin
    .from("time_to_first_value_events")
    .insert({
      user_id: access.user.id,
      company_id: insertedCompany.id,
      event_type: "onboarding_completed",
      event_source: "company_onboarding_api",
      account_type: accountType,
      step_label: "Complete Onboarding",
      estimated_seconds_remaining: 0,
      metadata: { target_minutes: 15 },
    })
    .then(() => null);

  await supabaseAdmin
    .from("time_to_first_value_events")
    .insert({
      user_id: access.user.id,
      company_id: insertedCompany.id,
      event_type: "first_package_generated",
      event_source: "company_onboarding_api",
      account_type: accountType,
      step_label: "Generate First Package",
      estimated_seconds_remaining: 0,
      metadata: {
        target_minutes: 15,
        data_connection_status: dataConnectionStatus,
        data_source_path: dataSourcePath,
        report_mode: dataSourcePath === "manual_upload" ? "free_manual_upload" : "full_connected_intelligence",
        package_level: packageLevel,
        recommended_package: recommendedPackage || packageLevel,
      },
    })
    .then(() => null);

  const invitationRows = invitations
    .map((invitation) => ({
      company_id: insertedCompany.id,
      email: String(invitation.email || "").trim().toLowerCase(),
      role: normalizeRole(invitation.role),
      status: "pending",
      invited_by: access.user.id,
    }))
    .filter((invitation) => invitation.email);

  if (invitationRows.length) {
    await supabaseAdmin.from("company_invitations").insert(invitationRows);
    await auditSecurityEvent({
      eventType: "permission_invitations_created",
      actorUserId: access.user.id,
      actorEmail: access.user.email || null,
      companyId: insertedCompany.id,
      resourceType: "company_invitation",
      resourceId: insertedCompany.id,
      metadata: {
        invitation_count: invitationRows.length,
        roles: invitationRows.map((invitation) => invitation.role),
      },
    });
  }

  await auditSecurityEvent({
    eventType: "report_generation_completed",
    actorUserId: access.user.id,
    actorEmail: access.user.email || null,
    companyId: insertedCompany.id,
    resourceType: "executive_package",
    resourceId: insertedCompany.id,
    metadata: {
      report_type: "first_package",
      data_connection_status: dataConnectionStatus,
      data_source_path: dataSourcePath,
      package_level: packageLevel,
      recommended_package: recommendedPackage || packageLevel,
    },
  });

  return NextResponse.json({
    ok: true,
    account_type: accountType,
    practice_id: practiceId,
    company: normalizeCompanyAccount(insertedCompany),
    invitations: invitationRows,
  });
}
