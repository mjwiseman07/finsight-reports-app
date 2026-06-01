"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { HelpTip } from "../../components/HelpTip";
import { SupportHelpButton } from "../../components/SupportHelpButton";
import { SupportTicketForm } from "../../components/SupportTicketForm";
import {
  accountingReportCatalog,
  accountTypeOptions,
  buildReportDiscovery,
  companyPackageOptions,
  connectedAccountingSystemOptions,
  industryTypeOptions,
  manualFinancialUploadReports,
  recommendPackageFromReports,
  revenueRangeOptions,
} from "../../lib/company-account";
import { contextualHelp } from "../../lib/contextual-help";
import {
  formatEstimatedRemaining,
  getEstimatedRemainingSeconds,
  getStepEstimatedSeconds,
  onboardingDesignPrinciple,
} from "../../lib/onboarding-success";
import { downloadFinancialPackagePdf } from "../../lib/financial-package-pdf";
import { supabase } from "../../lib/supabase";

const demoTemplates: Record<string, Partial<CompanyForm>> = {
  "demo-manufacturing": {
    name: "Manufacturing Demo Company",
    industry_type: "Manufacturing",
    primary_persona: "business-owner",
    package_level: "virtual-cfo",
    accounting_system: "QuickBooks Online",
  },
  "demo-construction": {
    name: "Construction Demo Company",
    industry_type: "Construction",
    primary_persona: "controller",
    package_level: "professional",
    accounting_system: "Sage",
  },
  "demo-healthcare": {
    name: "Healthcare Demo Company",
    industry_type: "Healthcare",
    primary_persona: "bookkeeper",
    package_level: "essential",
    accounting_system: "Manual Financial Upload",
  },
  "demo-professional-services": {
    name: "Professional Services Demo Company",
    industry_type: "Professional Services",
    primary_persona: "fractional-cfo",
    package_level: "virtual-cfo",
    accounting_system: "QuickBooks Online",
  },
};

type CompanyForm = {
  name: string;
  industry_type: string;
  fiscal_year: string;
  revenue_range: string;
  employee_count: string;
  accounting_system: string;
  primary_persona: string;
  package_level: string;
  data_source: string;
};

type UploadSelections = Record<string, boolean>;
type ReportSummary = {
  found: Array<{ id: string; label: string }>;
  missing: Array<{ id: string; label: string }>;
};
type ConnectionStatus = "idle" | "connecting" | "connected";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("companyTemplate") || "";
  const isSuperAdmin = searchParams?.get("superAdmin") === "true";
  const template = demoTemplates[templateId] || {};
  const queryLeadId = searchParams?.get("leadId") || "";

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [firstPackageReady, setFirstPackageReady] = useState(false);
  const [firstPackageSession, setFirstPackageSession] = useState<Record<string, unknown>>({});
  const [supportOpen, setSupportOpen] = useState(false);
  const [manualCompanySetupVisible, setManualCompanySetupVisible] = useState(template.accounting_system === "Manual Financial Upload");
  const [packageStatusIndex, setPackageStatusIndex] = useState(0);
  const hasTrackedStart = useRef(false);
  const [accountType, setAccountType] = useState(searchParams?.get("accountType") || "my-own-company");
  const [company, setCompany] = useState<CompanyForm>({
    name: template.name || "",
    industry_type: template.industry_type || "",
    fiscal_year: template.fiscal_year || "",
    revenue_range: "",
    employee_count: "",
    accounting_system: template.accounting_system || "QuickBooks Online",
    primary_persona: template.primary_persona || "business-owner",
    package_level: template.package_level || "essential",
    data_source: template.accounting_system || "QuickBooks Online",
  });
  const [dataSourcePath, setDataSourcePath] = useState<"connected" | "manual_upload">(
    template.accounting_system === "Manual Financial Upload" ? "manual_upload" : "connected",
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionValidationOpen, setConnectionValidationOpen] = useState(false);
  const [freeReviewLeadId, setFreeReviewLeadId] = useState(queryLeadId);
  const [reportSummary, setReportSummary] = useState<ReportSummary>({ found: [], missing: accountingReportCatalog });
  const [recommendedPackage, setRecommendedPackage] = useState(company.package_level);
  const [manualUploads, setManualUploads] = useState<UploadSelections>({
    balance_sheet: false,
    income_statement: false,
    ar_aging: false,
    ap_aging: false,
    payroll_reports: false,
    fixed_asset_reports: false,
    budget_reports: false,
  });
  const [delivery, setDelivery] = useState({
    weekly_brief_enabled: true,
    monthly_package_enabled: true,
    quarterly_review_enabled: false,
    recipient_emails: "",
    approval_required: true,
    auto_send_enabled: false,
  });

  const steps = useMemo(() => {
    return [
      "Customer Type Selection",
      "Connect QuickBooks",
      "Upload Financial Reports",
      "Select Industry",
      "Configure Pulse",
      "Generate First Review",
      "Dashboard",
    ];
  }, []);

  const updateCompany = (key: keyof CompanyForm, value: string) => {
    setCompany((current) => ({ ...current, [key]: value }));
  };

  const companyInfoStep = 0;
  const connectQuickBooksStep = 1;
  const uploadReportsStep = 2;
  const industryStep = 3;
  const configurePulseStep = 4;
  const generatePackageStep = 5;
  const dashboardStep = 6;
  const estimatedRemainingSeconds = getEstimatedRemainingSeconds(steps, step);
  const currentStepSeconds = getStepEstimatedSeconds(steps[step]);
  const progressPercent = Math.round(((step + 1) / steps.length) * 100);
  const packageBuildStatuses = [
    "Upload Complete",
    "Analyzing Financials",
    "Building Executive Summary",
    "Building Dashboard",
    "Building Package",
  ];

  const readValidStoredAuthToken = () => {
    const isInvalidJwt = (authToken: string) => {
      try {
        if (authToken.split(".").length !== 3) return true;
        const payload = JSON.parse(window.atob(authToken.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
        return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
      } catch {
        return true;
      }
    };

    const storedToken = window.localStorage.getItem("supabase_access_token") || "";
    if (storedToken && !isInvalidJwt(storedToken)) return storedToken;
    if (storedToken) window.localStorage.removeItem("supabase_access_token");

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) || "";
      if (!key.includes("auth-token")) continue;
      try {
        const parsedValue = JSON.parse(window.localStorage.getItem(key) || "{}");
        const accessToken =
          parsedValue?.access_token ||
          parsedValue?.currentSession?.access_token ||
          parsedValue?.session?.access_token;
        if (accessToken && !isInvalidJwt(accessToken)) return accessToken;
      } catch {
        // Ignore unrelated localStorage values.
      }
    }

    return "";
  };

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data.session?.access_token || "";
    if (sessionToken) {
      window.localStorage.setItem("supabase_access_token", sessionToken);
      return sessionToken;
    }
    return readValidStoredAuthToken();
  };

  const enrichFreeReviewLead = async ({
    status = "onboarding_started",
    nextCompany = company,
    nextReportSummary = reportSummary,
  }: {
    status?: string;
    nextCompany?: CompanyForm;
    nextReportSummary?: ReportSummary;
  } = {}) => {
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    if (!leadId) return;

    await fetch("/api/free-review/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: leadId,
        legal_company_name: nextCompany.name,
        business_name: nextCompany.name,
        industry: nextCompany.industry_type,
        revenue_range: nextCompany.revenue_range,
        fiscal_year: nextCompany.fiscal_year,
        status,
        additional_business_information: {
          accounting_system: nextCompany.accounting_system,
          data_source: nextCompany.data_source,
          employee_count: nextCompany.employee_count,
          recommended_package: recommendedPackage,
          report_discovery: nextReportSummary,
        },
      }),
    }).catch(() => {
      // Lead enrichment should not interrupt onboarding.
    });
  };

  const trackTimeToFirstValue = async ({
    eventType,
    companyId = null,
    stepLabel = steps[step],
    estimatedSecondsRemaining = estimatedRemainingSeconds,
  }: {
    eventType: string;
    companyId?: string | null;
    stepLabel?: string;
    estimatedSecondsRemaining?: number;
  }) => {
    const token = await getAuthToken();
    if (!token) return;

    await fetch("/api/onboarding/time-to-first-value", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_type: eventType,
        account_type: accountType,
        company_id: companyId,
        step_label: stepLabel,
        estimated_seconds_remaining: estimatedSecondsRemaining,
        metadata: {
          path: "company_onboarding",
          target_minutes: onboardingDesignPrinciple.targetMinutes,
          total_steps: steps.length,
        },
      }),
    }).catch(() => {
      // Tracking should never interrupt onboarding.
    });
  };

  useEffect(() => {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    void trackTimeToFirstValue({ eventType: "onboarding_started" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isSuperAdmin) return;
    const storedLeadId = window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    const nextLeadId = queryLeadId || storedLeadId;
    if (!nextLeadId) {
      router.replace("/free-review?source=onboarding-gate");
      return;
    }
    setFreeReviewLeadId(nextLeadId);
    window.localStorage.setItem("advisacor_free_review_lead_id", nextLeadId);
  }, [isSuperAdmin, queryLeadId, router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (searchParams?.get("quickBooksConnected") !== "true") return;
    const importedQuickBooksProfile = {
      ...company,
      name: company.name || "QuickBooks Company",
      industry_type: company.industry_type || "Professional Services",
      revenue_range: company.revenue_range || "$1M-$5M",
      fiscal_year: company.fiscal_year || "Calendar Year",
      employee_count: company.employee_count || "10",
      data_source: "QuickBooks Online",
      accounting_system: "QuickBooks Online",
    };
    setDataSourcePath("connected");
    setConnectionStatus("connected");
    setCompany(importedQuickBooksProfile);
    const discovery = buildReportDiscovery("QuickBooks Online");
    const hasRequiredReports = hasRequiredFinancialReports(discovery);
    setReportSummary(discovery);
    applyRecommendation(discovery.found);
    setManualCompanySetupVisible(!hasCompanyProfileFields(importedQuickBooksProfile));
    setConnectionValidationOpen(!hasRequiredReports);
    setStep(hasRequiredReports ? industryStep : uploadReportsStep);
    window.localStorage.setItem("advisacor_onboarding_quickbooks_connected", "true");
    window.localStorage.setItem("advisacor_onboarding_quickbooks_profile", JSON.stringify(importedQuickBooksProfile));
    window.localStorage.setItem("advisacor_onboarding_quickbooks_reports", JSON.stringify(discovery));
    setMessage("QuickBooks connected successfully. We imported your available company profile and report data.");
    void enrichFreeReviewLead({
      status: "quickbooks_connected",
      nextCompany: importedQuickBooksProfile,
      nextReportSummary: discovery,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const getPrimaryPersonaForAccountType = (selectedAccountType: string) => {
    if (selectedAccountType === "bookkeeper-advisor") return "bookkeeper";
    if (selectedAccountType === "fractional-cfo-firm") return "fractional-cfo";
    return "business-owner";
  };

  const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  function applyRecommendation(foundReports: Array<{ id: string; label: string }>) {
    const nextRecommendation = recommendPackageFromReports(foundReports.map((report) => report.id));
    setRecommendedPackage(nextRecommendation);
    setCompany((current) => ({ ...current, package_level: nextRecommendation }));
  }

  function hasCompanyProfileFields(profile: CompanyForm) {
    return Boolean(
      profile.name.trim() &&
        profile.industry_type &&
        profile.revenue_range &&
        profile.employee_count.trim() &&
        profile.fiscal_year,
    );
  }

  function hasRequiredFinancialReports(summary: ReportSummary) {
    const foundIds = new Set(summary.found.map((report) => report.id));
    return foundIds.has("balance_sheet") && foundIds.has("income_statement");
  }

  const isStepComplete = (index: number) => {
    if (index < step) return true;
    if (index === companyInfoStep) return Boolean(accountType);
    if (index === connectQuickBooksStep) return connectionStatus === "connected";
    if (index === uploadReportsStep) return !needsSupplementalUploads || canContinueFromUploads();
    return false;
  };

  const needsSupplementalUploads = dataSourcePath === "manual_upload" || (connectionStatus === "connected" && !hasRequiredFinancialReports(reportSummary));

  const validateAccountingConnection = async () => {
    setError("");
    setMessage("");
    if (company.data_source === "QuickBooks Online") {
      const token = await getAuthToken();
      const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
      if (!token && !leadId) {
        router.push("/free-review?source=quickbooks-connect-gate");
        return;
      }

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("quickBooksConnected", "true");
      if (leadId) returnUrl.searchParams.set("leadId", leadId);
      const connectParams = new URLSearchParams({
        returnTo: `${returnUrl.pathname}${returnUrl.search}`,
      });
      if (!token && leadId) connectParams.set("leadId", leadId);
      const response = await fetch(`/api/quickbooks/connect?${connectParams.toString()}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        if (response.status === 401 && token) {
          window.localStorage.removeItem("supabase_access_token");
          setError("Your login session expired. Please sign in again, then reconnect QuickBooks.");
          router.push(`/signin?next=${encodeURIComponent("/onboarding")}`);
          return;
        }
        setError(result.error || "Unable to start QuickBooks connection. Please complete lead capture first or try again.");
        return;
      }
      window.location.assign(result.url);
      return;
    }

    setConnectionStatus("connecting");
    await delay(850);
    const discovery = buildReportDiscovery(company.data_source);
    setReportSummary(discovery);
    applyRecommendation(discovery.found);
    setCompany((current) => ({
      ...current,
      name: current.name || `${company.data_source} Company`,
      industry_type: current.industry_type === "Other" && (company.data_source === "QuickBooks Enterprise" || company.data_source === "Sage") ? "Manufacturing" : current.industry_type,
      revenue_range: current.revenue_range || "$5M-$25M",
      employee_count: current.employee_count || "25",
    }));
    setConnectionStatus("connected");
    setConnectionValidationOpen(true);
  };

  const updateManualUpload = (reportId: string, selected: boolean) => {
    const nextUploads = { ...manualUploads, [reportId]: selected };
    setManualUploads(nextUploads);
    const found = manualFinancialUploadReports
      .filter((report) => nextUploads[report.id])
      .map((report) => ({
        id:
          report.id === "payroll_reports"
            ? "payroll"
            : report.id === "fixed_asset_reports"
              ? "fixed_assets"
              : report.id === "budget_reports"
                ? "budget"
                : report.id,
        label: report.label,
      }));
    const foundIds = new Set(found.map((report) => report.id));
    const missing = accountingReportCatalog.filter((report) => !foundIds.has(report.id));
    setReportSummary({ found, missing });
    applyRecommendation(found);
  };

  const canContinueFromQuickBooks = () => {
    if (dataSourcePath === "manual_upload") {
      return Boolean(manualCompanySetupVisible && hasCompanyProfileFields(company));
    }
    if (connectionStatus === "connected" && manualCompanySetupVisible) {
      return hasCompanyProfileFields(company);
    }
    return connectionStatus === "connected";
  };

  const canContinueFromUploads = () => {
    if (!needsSupplementalUploads) return true;
    return Boolean(manualUploads.balance_sheet && manualUploads.income_statement);
  };

  const continueOnboarding = () => {
    setError("");
    if (step === connectQuickBooksStep && !canContinueFromQuickBooks()) {
      setError(
        "Connect QuickBooks before continuing, or choose Skip for Now and complete the manual company setup fields.",
      );
      return;
    }
    if (step === uploadReportsStep && !canContinueFromUploads()) {
      setError("Upload or confirm both Balance Sheet and Income Statement before continuing.");
      return;
    }
    setStep((current) => current + 1);
  };

  const chooseManualUploadPath = () => {
    setDataSourcePath("manual_upload");
    setConnectionStatus("idle");
    updateCompany("data_source", "Manual Financial Upload");
    setManualCompanySetupVisible(true);
    setMessage("Manual setup selected. Complete the company fields below, then continue to Step 3.");
    void enrichFreeReviewLead({ status: "manual_upload_selected" });
  };

  const continueAfterConnectionValidation = () => {
    setConnectionValidationOpen(false);
    setError("");
    setStep((current) => (current <= connectQuickBooksStep ? (hasRequiredFinancialReports(reportSummary) ? industryStep : uploadReportsStep) : current));
  };

  const openReportGuide = () => {
    const popup = window.open("", "_blank", "width=900,height=1100");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head>
          <title>Advisacor Report Guide</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 48px; color: #111827; line-height: 1.6; }
            h1 { color: #0A1020; font-size: 34px; margin-bottom: 8px; }
            h2 { color: #0A1020; margin-top: 28px; }
            .brand { color: #D28A4A; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
            .box { border: 1px solid #E5E7EB; border-radius: 18px; padding: 20px; margin-top: 18px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <p class="brand">Advisacor Report Guide</p>
          <h1>How to export reports for your free financial review</h1>
          <p>Required reports: Balance Sheet and Income Statement. Optional reports: AR Aging, AP Aging, Payroll Reports, Fixed Asset Reports, and Budget Reports.</p>
          <div class="box">
            <h2>QuickBooks Online</h2>
            <ul>
              <li>Go to Reports, then Business overview for Balance Sheet and Profit and Loss.</li>
              <li>Use Who owes you for AR Aging and What you owe for AP Aging.</li>
              <li>Use Sales, Products and Services, or Inventory reports for inventory exports.</li>
            </ul>
          </div>
          <div class="box">
            <h2>QuickBooks Desktop</h2>
            <ul>
              <li>Go to Reports, then Company & Financial for Balance Sheet and Profit & Loss.</li>
              <li>Use Customers & Receivables for AR Aging.</li>
              <li>Use Vendors & Payables for AP Aging.</li>
              <li>Use Inventory reports for item valuation or stock status.</li>
            </ul>
          </div>
          <div class="box">
            <h2>QuickBooks Enterprise</h2>
            <ul>
              <li>Use Desktop report menus for core statements, AR, AP, and inventory.</li>
              <li>Use Advanced Reporting for job costing, manufacturing, inventory, and industry-specific exports.</li>
            </ul>
          </div>
          <p>Future guide sections will include Xero, NetSuite, Sage, and Microsoft Dynamics screenshots and workflows.</p>
          <script>window.print()</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const downloadTrialReport = () => {
    downloadFinancialPackagePdf({
      companyName: company.name || "QuickBooks Company",
      industryType: company.industry_type || "Industry Intelligence",
      preparedBy: "Advisacor",
      trial: true,
    });
  };

  const advanceToDashboard = () => {
    router.push("/dashboard?firstPackage=ready");
  };

  const generateFirstPackage = async () => {
    setError("");
    setMessage("");
    setIsSaving(true);
    setPackageStatusIndex(0);

    try {
      const missingRequiredUploads = dataSourcePath === "manual_upload" && (!manualUploads.balance_sheet || !manualUploads.income_statement);
      if (missingRequiredUploads) {
        setError("Upload or confirm both Balance Sheet and Income Statement before generating the free report.");
        return;
      }
      if (dataSourcePath === "connected" && connectionStatus !== "connected") {
        setError("Connect and validate your accounting system before generating the full one-time free package.");
        return;
      }

      for (let index = 0; index < packageBuildStatuses.length; index += 1) {
        setPackageStatusIndex(index);
        await delay(450);
      }

      const token = await getAuthToken();
      if (!token) {
        const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
        if (!leadId) {
          router.push("/free-review?source=generate-review-gate");
          return;
        }
        await enrichFreeReviewLead({
          status: "first_package_generated",
          nextCompany: company,
          nextReportSummary: reportSummary,
        });
        const leadDashboardSession = {
          firstPackage: "ready",
          leadId,
          companyName: company.name || "Your Company",
          industryType: company.industry_type || "Industry Intelligence",
          packageLevel: company.package_level,
          dataSourcePath,
          quickBooksConnected: connectionStatus === "connected",
          generatedAt: new Date().toISOString(),
          onboardingComplete: true,
        };
        window.localStorage.setItem("advisacor_lead_dashboard_session", JSON.stringify(leadDashboardSession));
        window.localStorage.setItem("advisacor_onboarding_complete", "true");
        window.localStorage.setItem("advisacor_first_package_status", "generated");
        setFirstPackageSession(leadDashboardSession);
        setFirstPackageReady(true);
        downloadTrialReport();
        setMessage("Your first Advisacor financial review is ready. Downloading your PDF package and opening your company dashboard...");
        window.setTimeout(advanceToDashboard, 900);
        return;
      }

      const response = await fetch("/api/company/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_type: accountType,
          is_demo: isSuperAdmin,
          practice: {
            name: accountType === "my-own-company" ? "" : `${company.name || "Client"} Practice`,
          },
          company: {
            ...company,
            accounting_system: dataSourcePath === "manual_upload" ? "Manual Financial Upload" : company.data_source,
            primary_persona: getPrimaryPersonaForAccountType(accountType),
          },
          delivery_settings: delivery,
          data_source_path: dataSourcePath,
          manual_uploads: manualUploads,
          report_discovery: reportSummary,
          recommended_package: recommendedPackage,
          data_connection_status: dataSourcePath === "manual_upload" ? "upload_configured" : "connected",
          first_package_generated: true,
          invitations: [],
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to complete onboarding.");
        return;
      }

      await enrichFreeReviewLead({
        status: "first_package_generated",
        nextCompany: company,
        nextReportSummary: reportSummary,
      });

      setMessage(
        "Your first executive package is ready. Redirecting to your company dashboard...",
      );
      window.localStorage.setItem("advisacor_onboarding_complete", "true");
      window.localStorage.setItem("advisacor_first_package_status", "generated");
      setFirstPackageSession({
        companyName: result.company?.name || company.name,
        industryType: result.company?.industryType || company.industry_type,
        packageLevel: result.company?.packageLevel || company.package_level,
        firstPackage: "ready",
      });
      setFirstPackageReady(true);
      downloadTrialReport();
      setMessage("Your first Advisacor financial review is ready. Downloading your PDF package and opening your company dashboard...");
      window.setTimeout(advanceToDashboard, 900);
    } catch {
      setError("Unable to generate your first package.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          {isSuperAdmin && (
            <div className="rounded-full border border-red-300/40 bg-red-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-100">
              Super Admin Journey Test
            </div>
          )}
          <SupportHelpButton onClick={() => setSupportOpen(true)} compact />
        </header>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Company Account Onboarding</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">Reach your first executive package in under 15 minutes.</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                Choose the fastest path to value: upload financial statements for a limited free report or connect accounting for the full Advisacor intelligence platform.
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5 text-left lg:w-80">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Time To First Value</p>
              <p className="mt-2 text-2xl font-black text-white">{formatEstimatedRemaining(estimatedRemainingSeconds)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Target: meaningful output in {onboardingDesignPrinciple.targetMinutes} minutes or less.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-white">Guided setup progress</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Step {step + 1} of {steps.length}: {steps[step]} should take about {Math.max(1, Math.ceil(currentStepSeconds / 60))} minute{Math.ceil(currentStepSeconds / 60) === 1 ? "" : "s"}.
              </p>
            </div>
            <p className="text-sm font-black text-[#FFB36F]">{progressPercent}% complete</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-[#FF7A1A]" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
            We only ask for what helps you reach a useful first package faster. Anything that can wait should be automated, simplified, or postponed.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FF7A1A]/20 bg-[#FF7A1A]/10 px-4 py-3">
            <p className="text-sm font-bold text-[#FFD0AB]">Need Help? Ask an onboarding question or submit a support ticket without leaving setup.</p>
            <SupportHelpButton onClick={() => setSupportOpen(true)} compact />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.32fr_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-sm font-black text-white">Onboarding Progress</p>
            <div className="mt-4 grid gap-2">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    step === index ? "bg-[#FF7A1A] text-white" : isStepComplete(index) ? "bg-emerald-400/10 text-emerald-100" : "bg-white/[0.05] text-slate-400"
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-[0.18em] opacity-75">Step {index + 1}</span>
                  <span className="mt-1 block">{label}{isStepComplete(index) && step !== index ? " ✓" : ""}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            {step === companyInfoStep && (
              <div className="grid gap-5">
                <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                  <p className="text-sm font-black text-emerald-100">Customer Type Selection</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Start here so Advisacor can tailor the onboarding wizard, report package, and Pulse commentary to the right customer type.
                  </p>
                </div>
                <ChoiceGrid
                  options={accountTypeOptions}
                  selected={accountType}
                  help={contextualHelp.accountType}
                  onSelect={(value) => {
                    setAccountType(value);
                    if (value === "fractional-cfo-firm") {
                      setCompany((current) => ({ ...current, package_level: "virtual-cfo", primary_persona: "fractional-cfo" }));
                    }
                    if (value === "bookkeeper-advisor") {
                      setCompany((current) => ({ ...current, primary_persona: "bookkeeper" }));
                    }
                    if (value === "my-own-company") {
                      setCompany((current) => ({ ...current, primary_persona: "business-owner" }));
                    }
                  }}
                />
              </div>
            )}

            {step === industryStep && (
              <div className="grid gap-5">
                <div className="rounded-3xl border border-blue-300/25 bg-blue-400/10 p-5">
                  <p className="text-sm font-black text-blue-100">Select Industry</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Industry type drives KPI recommendations, dashboard emphasis, benchmarking, and Pulse commentary.
                  </p>
                </div>
                <Select label="Industry type" value={company.industry_type} options={industryTypeOptions} help={contextualHelp.industryType} onChange={(value) => updateCompany("industry_type", value)} />
                {recommendedPackage && (
                  <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                    <p className="text-sm font-black text-emerald-100">Recommended Based On Your Available Data</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Current recommendation: {companyPackageOptions.find((option) => option.id === recommendedPackage)?.label || recommendedPackage}. Advisacor will automatically update this after report discovery. You can override it if your operating model requires a different package.
                    </p>
                  </div>
                )}
                <ChoiceGrid
                  options={companyPackageOptions.map((option) => ({ id: option.id, label: option.label, description: option.scope.join(", ") }))}
                  selected={company.package_level}
                  help={contextualHelp.packageSelection}
                  onSelect={(value) => updateCompany("package_level", value)}
                />
              </div>
            )}

            {step === connectQuickBooksStep && (
              <div className="grid gap-5">
                <div className="flex items-center gap-2 text-sm font-black text-slate-200">
                  Connect QuickBooks
                  <HelpTip content={contextualHelp.dataSource} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDataSourcePath("connected");
                      setConnectionStatus("idle");
                      setManualCompanySetupVisible(false);
                      setMessage("");
                      setReportSummary({ found: [], missing: accountingReportCatalog });
                      if (!connectedAccountingSystemOptions.includes(company.data_source)) {
                        updateCompany("data_source", "QuickBooks Online");
                      }
                    }}
                    className={`rounded-3xl border p-5 text-left transition ${
                      dataSourcePath === "connected" ? "border-[#FF7A1A]/70 bg-[#FF7A1A]/15" : "border-white/10 bg-[#0A1020] hover:border-white/25"
                    }`}
                  >
                    <p className="text-lg font-black text-white">Connect QuickBooks</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Connect your accounting system to unlock the full Advisacor intelligence platform.
                    </p>
                    <ul className="mt-4 grid gap-2 text-sm text-slate-300">
                      {["Full report", "Full intelligence engine", "Automated updates", "Weekly Executive Briefs", "Monthly Packages", "AI access", "Forecasting", "Budgeting", "Industry intelligence"].map((benefit) => (
                        <li key={benefit}>- {benefit}</li>
                      ))}
                    </ul>
                  </button>
                  <button
                    type="button"
                    onClick={chooseManualUploadPath}
                    className={`rounded-3xl border p-5 text-left transition ${
                      dataSourcePath === "manual_upload" ? "border-emerald-300/60 bg-emerald-400/10" : "border-white/10 bg-[#0A1020] hover:border-white/25"
                    }`}
                  >
                    <p className="text-lg font-black text-white">Skip for Now / Upload Reports Instead</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Skip QuickBooks and provide company information manually.
                    </p>
                    <p className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">
                      Manual setup fields will appear below.
                    </p>
                  </button>
                </div>

                {dataSourcePath === "connected" ? (
                  <div className="rounded-3xl border border-white/10 bg-[#0A1020] p-5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white">Connect QuickBooks Online</p>
                      <HelpTip content={contextualHelp.accountingSystem} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Advisacor will use QuickBooks data to populate company settings and discover available reports automatically.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void validateAccountingConnection()}
                        disabled={connectionStatus === "connecting"}
                        className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {connectionStatus === "connecting" ? "Connecting..." : connectionStatus === "connected" ? "QuickBooks Connected" : "Connect QuickBooks"}
                      </button>
                      <button type="button" onClick={() => setConnectionValidationOpen(true)} disabled={connectionStatus !== "connected"} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                        View Validation Summary
                      </button>
                    </div>
                    {connectionStatus !== "connected" && (
                      <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
                        Connect QuickBooks to auto-populate company details, or choose Skip for Now to enter them manually.
                      </p>
                    )}
                    {connectionStatus === "connected" && !manualCompanySetupVisible && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                          <p className="text-sm font-black text-emerald-100">QuickBooks company profile imported</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            Advisacor found the core company information it needs, so no manual company setup is required.
                          </p>
                          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                            {[
                              ["Company Name", company.name],
                              ["Industry", company.industry_type],
                              ["Revenue", company.revenue_range],
                              ["Fiscal Year", company.fiscal_year],
                              ["Employee Count", company.employee_count],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                                <dd className="mt-1 font-black text-white">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
                      </div>
                    )}
                    {connectionStatus === "connected" && manualCompanySetupVisible && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                          <p className="text-sm font-black text-emerald-100">We found partial company information.</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            Advisacor imported what QuickBooks provided. Confirm or complete the missing fields below.
                          </p>
                          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                            {[
                              ["Company Name", company.name || "QuickBooks Company"],
                              ["Industry", company.industry_type || "Professional Services"],
                              ["Revenue", company.revenue_range || "$1M-$5M"],
                              ["Fiscal Year", company.fiscal_year || "Calendar Year"],
                              ["Employee Count", company.employee_count || "Imported if available"],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                <dt className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                                <dd className="mt-1 font-black text-white">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
                      </div>
                    )}
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ComparisonList
                        title="Connected Accounting System"
                        items={["Full one-time free package", "Executive Summary", "Full PDF", "Sample PowerPoint", "Industry Intelligence", "AI Commentary", "Health Score", "Risks and Opportunities", "Weekly Executive Briefs", "Monthly Executive Packages", "Forecasting", "Budgeting"]}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                    <p className="text-sm font-black text-emerald-100">Manual setup selected</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Complete the company information below. Financial report uploads remain in Step 3.
                    </p>
                  </div>
                )}
                {manualCompanySetupVisible && (
                  <div className="rounded-3xl border border-white/10 bg-[#0A1020] p-5">
                    <p className="text-sm font-black text-white">Manual Company Setup</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      We only ask for these fields because QuickBooks was skipped or you chose to edit imported company details.
                    </p>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <Field label="Company name" value={company.name} help={contextualHelp.companyName} onChange={(value) => updateCompany("name", value)} />
                      <Select label="Revenue range" value={company.revenue_range} options={["", ...revenueRangeOptions]} optionLabels={{ "": "Select revenue range" }} help={contextualHelp.revenueRange} onChange={(value) => updateCompany("revenue_range", value)} />
                      <Field label="Employee count" value={company.employee_count} help={contextualHelp.employeeCount} onChange={(value) => updateCompany("employee_count", value)} />
                      <Select label="Industry" value={company.industry_type} options={["", ...industryTypeOptions]} optionLabels={{ "": "Select industry" }} help={contextualHelp.industryType} onChange={(value) => updateCompany("industry_type", value)} />
                      <Select label="Fiscal year" value={company.fiscal_year} options={["", "Calendar Year", "Fiscal Year"]} optionLabels={{ "": "Select fiscal year" }} onChange={(value) => updateCompany("fiscal_year", value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === uploadReportsStep && (
              <div className="grid gap-5">
                {!needsSupplementalUploads ? (
                  <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                    <p className="text-sm font-black text-emerald-100">Reports discovered from QuickBooks</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      No manual uploads are required. Advisacor will use the reports discovered during the QuickBooks connection.
                    </p>
                    <div className="mt-5">
                      <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-[#0A1020] p-5">
                    <p className="text-sm font-black text-white">Upload Financial Reports</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {dataSourcePath === "connected"
                        ? "QuickBooks did not provide every required financial report. Upload Balance Sheet and Income Statement to complete the first review."
                        : "Required uploads: Balance Sheet and Income Statement. Optional uploads: AR Aging, AP Aging, Payroll Reports, Fixed Asset Reports, and Budget Reports."}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {manualFinancialUploadReports.map((report) => (
                        <UploadReportInput
                          key={report.id}
                          label={report.label}
                          required={report.required}
                          selected={Boolean(manualUploads[report.id])}
                          onChange={(selected) => updateManualUpload(report.id, selected)}
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={openReportGuide} className="rounded-2xl border border-[#FF7A1A]/30 bg-[#FF7A1A]/10 px-5 py-3 text-sm font-black text-[#FFD0AB]">
                        Download Report Guide PDF
                      </button>
                    </div>
                    {manualUploads.balance_sheet && manualUploads.income_statement && (
                      <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} manual />
                    )}
                  </div>
                )}
              </div>
            )}

            {step === configurePulseStep && (
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 p-5">
                  <p className="text-sm font-black text-white">Configure Pulse</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Configure briefs, monthly package delivery, approval settings, and how Pulse will keep stakeholders informed.
                  </p>
                </div>
                <Toggle label="Weekly Executive Brief enabled" help={contextualHelp.reportingCadence} checked={delivery.weekly_brief_enabled} onChange={(value) => setDelivery((current) => ({ ...current, weekly_brief_enabled: value }))} />
                <Toggle label="Monthly Package enabled" help={contextualHelp.packageType} checked={delivery.monthly_package_enabled} onChange={(value) => setDelivery((current) => ({ ...current, monthly_package_enabled: value }))} />
                <Toggle label="Quarterly Review enabled" help={contextualHelp.reportingCadence} checked={delivery.quarterly_review_enabled} onChange={(value) => setDelivery((current) => ({ ...current, quarterly_review_enabled: value }))} />
                <Field label="Recipient emails" value={delivery.recipient_emails} help={contextualHelp.recipientEmails} onChange={(value) => setDelivery((current) => ({ ...current, recipient_emails: value }))} placeholder="owner@example.com, advisor@example.com" />
                <Toggle label="Require approval before sending" help={contextualHelp.approvalRequired} checked={delivery.approval_required} onChange={(value) => setDelivery((current) => ({ ...current, approval_required: value }))} />
                <Toggle label="Auto-send enabled" help={contextualHelp.autoSend} checked={delivery.auto_send_enabled} onChange={(value) => setDelivery((current) => ({ ...current, auto_send_enabled: value }))} />
              </div>
            )}

            {step === generatePackageStep && (
              <div className="grid gap-5">
                {firstPackageReady && (
                  <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-6">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">Report Ready</p>
                    <h2 className="mt-3 text-3xl font-black text-white">Your first Advisacor financial review is ready.</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Pulse has identified 3 opportunities and 2 risks in your business.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={downloadTrialReport} className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
                        Download Report
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (Object.keys(firstPackageSession).length) {
                            window.localStorage.setItem("advisacor_lead_dashboard_session", JSON.stringify(firstPackageSession));
                          }
                          router.push("/dashboard");
                        }}
                        className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200"
                      >
                        View Dashboard
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-3xl border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 p-5">
                  <p className="text-sm font-black text-white">Generate First Package</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Advisacor will now generate your executive summary, dashboard, and initial package, then take you directly to your company dashboard.
                  </p>
                  {dataSourcePath === "manual_upload" && (
                    <p className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">
                      Limited report generated from uploaded financial statements.
                    </p>
                  )}
                  {dataSourcePath === "connected" && (
                    <p className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">
                      Full one-time free package: Executive Summary, Full PDF, Sample PowerPoint, Industry Intelligence, AI Commentary, Health Score, Risks, and Opportunities.
                    </p>
                  )}
                </div>
                <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} manual={dataSourcePath === "manual_upload"} />
                <div className="grid gap-3">
                  {packageBuildStatuses.map((status, index) => (
                    <div
                      key={status}
                      className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                        index <= packageStatusIndex && isSaving
                          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                          : "border-white/10 bg-[#0A1020] text-slate-400"
                      }`}
                    >
                      {status}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void generateFirstPackage()}
                  disabled={isSaving}
                  className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Generating First Package..." : "Generate First Package"}
                </button>
              </div>
            )}

            {step === dashboardStep && (
              <div className="grid gap-5">
                <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                  <p className="text-sm font-black text-emerald-100">Dashboard</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    The final onboarding outcome is the customer dashboard. Generate the first review to complete setup and enter the dashboard with your first package context.
                  </p>
                </div>
                <Link href="/dashboard" className="inline-flex rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200">
                  Go to Dashboard
                </Link>
              </div>
            )}

            {error && <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</p>}
            {message && <p className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">{message}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={step === 0}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              {step < generatePackageStep ? (
                <button type="button" onClick={continueOnboarding} className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
                  Continue
                </button>
              ) : (
                <span className="text-sm font-bold text-slate-400">Generate your first package to finish onboarding.</span>
              )}
            </div>
          </section>
        </section>
      </div>
      {supportOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-white/10 bg-[#0A1020] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">Need Help?</p>
                <h2 className="mt-2 text-2xl font-black">Onboarding Support</h2>
              </div>
              <button type="button" onClick={() => setSupportOpen(false)} className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-black text-slate-300">
                Close
              </button>
            </div>
            <div className="mt-5">
              <SupportTicketForm defaultCategory="Onboarding" />
            </div>
          </section>
        </div>
      )}
      {connectionValidationOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-white/10 bg-[#0A1020] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">Connection Validation</p>
                <h2 className="mt-2 text-2xl font-black">Connected Reports Summary</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Advisacor discovered available reports, evaluated the data, and selected the recommended package.
                </p>
              </div>
              <button type="button" onClick={() => setConnectionValidationOpen(false)} className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-black text-slate-300">
                Close
              </button>
            </div>
            <div className="mt-5">
              <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
            </div>
            <button type="button" onClick={continueAfterConnectionValidation} className="mt-5 rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
              Continue With Recommended Package
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

type HelpContent = {
  title: string;
  explanation: string;
  why: string;
  example: string;
  impact: string;
};

function Field({ label, value, onChange, placeholder = "", help }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; help?: HelpContent }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-300">
      <span className="flex items-center gap-2">
        {label}
        <HelpTip content={help} />
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-white outline-none ring-[#FF7A1A]/50 focus:ring-2"
      />
    </label>
  );
}

function Select({ label, value, options, optionLabels = {}, onChange, help }: { label: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string) => void; help?: HelpContent }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-300">
      <span className="flex items-center gap-2">
        {label}
        <HelpTip content={help} />
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-white outline-none ring-[#FF7A1A]/50 focus:ring-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (value: boolean) => void; help?: HelpContent }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0A1020] p-4 text-sm font-black text-slate-100">
      <span className="flex items-center gap-2">
        {label}
        <HelpTip content={help} />
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#FF7A1A]" />
    </label>
  );
}

function ConnectedReportsSummary({ reportSummary, recommendedPackage, manual = false }: { reportSummary: ReportSummary; recommendedPackage: string; manual?: boolean }) {
  const packageLabel = companyPackageOptions.find((option) => option.id === recommendedPackage)?.label || recommendedPackage;
  return (
    <div className="mt-5 rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black text-white">Connected Reports Summary</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {manual ? "Manual upload gives a limited free report and sample PDF." : "Connected accounting unlocks the full one-time free package and full intelligence path."}
          </p>
        </div>
        <div className="rounded-2xl border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#FFB36F]">Recommended Package</p>
          <p className="mt-1 text-lg font-black text-white">{packageLabel}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
          <p className="text-sm font-black text-emerald-100">Found</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            {reportSummary.found.length ? reportSummary.found.map((report) => <span key={report.id}>✓ {report.label}</span>) : <span>No reports found yet.</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
          <p className="text-sm font-black text-red-100">Missing</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-400">
            {reportSummary.missing.length ? reportSummary.missing.map((report) => <span key={report.id}>× {report.label}</span>) : <span>No missing reports detected.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function UploadReportInput({ label, required, selected, onChange }: { label: string; required: boolean; selected: boolean; onChange: (selected: boolean) => void }) {
  return (
    <label className={`grid gap-2 rounded-2xl border p-4 text-sm font-bold ${selected ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{required ? "Required" : "Optional"}</span>
      </span>
      <input
        type="file"
        accept=".csv,.xlsx,.xls,.pdf"
        onChange={(event) => onChange(Boolean(event.target.files?.length))}
        className="block w-full cursor-pointer rounded-xl border border-white/10 bg-[#0A1020] text-xs text-slate-300 file:mr-3 file:border-0 file:bg-[#FF7A1A] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
      />
      <span className="text-xs text-slate-500">{selected ? "File selected" : "CSV, Excel, or PDF"}</span>
    </label>
  );
}

function ChoiceGrid({ options, selected, onSelect, help }: { options: Array<{ id: string; label: string; description: string }>; selected: string; onSelect: (value: string) => void; help?: HelpContent }) {
  return (
    <div className="grid gap-4">
      {help && (
        <div className="flex items-center gap-2 text-sm font-black text-slate-200">
          Need help choosing?
          <HelpTip content={help} />
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`rounded-3xl border p-5 text-left transition ${
              selected === option.id ? "border-[#FF7A1A]/70 bg-[#FF7A1A]/15" : "border-white/10 bg-[#0A1020] hover:border-white/25"
            }`}
          >
            <p className="text-lg font-black text-white">{option.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0A1020] p-6 text-white">Loading onboarding...</main>}>
      <OnboardingContent />
    </Suspense>
  );
}
