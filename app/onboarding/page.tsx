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

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [manualCompanyInfoOpen, setManualCompanyInfoOpen] = useState(false);
  const [packageStatusIndex, setPackageStatusIndex] = useState(0);
  const hasTrackedStart = useRef(false);
  const [accountType, setAccountType] = useState(searchParams?.get("accountType") || "my-own-company");
  const [company, setCompany] = useState<CompanyForm>({
    name: template.name || "",
    industry_type: template.industry_type || "Other",
    revenue_range: "$5M-$25M",
    employee_count: "25",
    accounting_system: template.accounting_system || "QuickBooks Online",
    primary_persona: template.primary_persona || "business-owner",
    package_level: template.package_level || "essential",
    data_source: template.accounting_system || "QuickBooks Online",
  });
  const [dataSourcePath, setDataSourcePath] = useState<"connected" | "manual_upload">(
    template.accounting_system && template.accounting_system !== "Manual Financial Upload" ? "connected" : "manual_upload",
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionValidationOpen, setConnectionValidationOpen] = useState(false);
  const [reportSummary, setReportSummary] = useState<ReportSummary>({ found: [], missing: accountingReportCatalog });
  const [recommendedPackage, setRecommendedPackage] = useState(company.package_level);
  const [manualUploads, setManualUploads] = useState<UploadSelections>({
    balance_sheet: false,
    income_statement: false,
    ar_aging: false,
    ap_aging: false,
    inventory_report: false,
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
      "Account Type",
      "Data Acquisition",
      "Company Information",
      "Package Recommendation",
      "Delivery Configuration",
      "Generate First Package",
    ];
  }, []);

  const updateCompany = (key: keyof CompanyForm, value: string) => {
    setCompany((current) => ({ ...current, [key]: value }));
  };

  const dataSourceStep = 1;
  const companyInfoStep = 2;
  const packageStep = 3;
  const deliveryStep = 4;
  const generatePackageStep = 5;
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
    const token = window.localStorage.getItem("supabase_access_token") || "";
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

  useEffect(() => {
    if (searchParams?.get("quickBooksConnected") !== "true") return;
    setDataSourcePath("connected");
    setConnectionStatus("connected");
    setCompany((current) => ({
      ...current,
      name: current.name || "QuickBooks Company",
      industry_type: current.industry_type === "Other" ? "Professional Services" : current.industry_type,
      revenue_range: current.revenue_range || "$1M-$5M",
      employee_count: current.employee_count || "10",
      data_source: "QuickBooks Online",
      accounting_system: "QuickBooks Online",
    }));
    const discovery = buildReportDiscovery("QuickBooks Online");
    setReportSummary(discovery);
    applyRecommendation(discovery.found);
    setConnectionValidationOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const getPrimaryPersonaForAccountType = (selectedAccountType: string) => {
    if (selectedAccountType === "bookkeeper-advisor") return "bookkeeper";
    if (selectedAccountType === "fractional-cfo-firm") return "fractional-cfo";
    return "business-owner";
  };

  const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  const applyRecommendation = (foundReports: Array<{ id: string; label: string }>) => {
    const nextRecommendation = recommendPackageFromReports(foundReports.map((report) => report.id));
    setRecommendedPackage(nextRecommendation);
    setCompany((current) => ({ ...current, package_level: nextRecommendation }));
  };

  const validateAccountingConnection = async () => {
    setError("");
    setMessage("");
    if (company.data_source === "QuickBooks Online") {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        router.push(`/signin?next=${encodeURIComponent("/onboarding")}`);
        return;
      }

      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("quickBooksConnected", "true");
      const response = await fetch(`/api/quickbooks/connect?returnTo=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        setError(result.error || "Unable to start QuickBooks connection.");
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
        id: report.id === "inventory_report" ? "inventory" : report.id,
        label: report.label,
      }));
    const foundIds = new Set(found.map((report) => report.id));
    const missing = accountingReportCatalog.filter((report) => !foundIds.has(report.id));
    setReportSummary({ found, missing });
    applyRecommendation(found);
  };

  const canContinueFromDataSource = () => {
    if (dataSourcePath === "connected") return connectionStatus === "connected";
    return Boolean(manualUploads.balance_sheet && manualUploads.income_statement);
  };

  const continueOnboarding = () => {
    setError("");
    if (step === dataSourceStep && !canContinueFromDataSource()) {
      setError(
        dataSourcePath === "connected"
          ? "Connect and validate your accounting system before continuing, or choose Upload Financial Statements."
          : "Upload or confirm both Balance Sheet and Income Statement before continuing.",
      );
      return;
    }
    setStep((current) => current + 1);
  };

  const chooseManualUploadPath = () => {
    setDataSourcePath("manual_upload");
    setConnectionStatus("idle");
    updateCompany("data_source", "Manual Financial Upload");
    setManualCompanyInfoOpen(true);
  };

  const continueAfterConnectionValidation = () => {
    setConnectionValidationOpen(false);
    setError("");
    setStep((current) => (current <= dataSourceStep ? companyInfoStep : current));
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
          <p>Required reports: Balance Sheet and Income Statement. Optional reports: AR Aging, AP Aging, and Inventory Report.</p>
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

      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        router.push(`/signin?next=${encodeURIComponent("/onboarding")}`);
        return;
      }

      for (let index = 0; index < packageBuildStatuses.length; index += 1) {
        setPackageStatusIndex(index);
        await delay(450);
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

      setMessage(
        "Your first executive package is ready. Redirecting to your company dashboard...",
      );
      const params = new URLSearchParams({
        firstPackage: "ready",
        companyId: result.company?.id || "",
        companyName: result.company?.name || company.name,
        industryType: result.company?.industryType || company.industry_type,
        packageLevel: result.company?.packageLevel || company.package_level,
        dataSourcePath,
      });
      router.push(`/dashboard?${params.toString()}`);
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
                    step === index ? "bg-[#FF7A1A] text-white" : index < step ? "bg-emerald-400/10 text-emerald-100" : "bg-white/[0.05] text-slate-400"
                  }`}
                >
                  {index + 1}. {label}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            {step === 0 && (
              <ChoiceGrid
                options={accountTypeOptions}
                selected={accountType}
                help={contextualHelp.accountType}
                onSelect={(value) => {
                  setAccountType(value);
                  setStep(0);
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
            )}

            {step === companyInfoStep && (
              <div className="grid gap-5">
                <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5">
                  <p className="text-sm font-black text-emerald-100">
                    {dataSourcePath === "connected" ? "Discovered from your accounting connection" : "Confirm company information"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {dataSourcePath === "connected"
                      ? "Advisacor retrieved what it could from the connection. Confirm or edit only the details needed for reporting and industry intelligence."
                      : "Manual upload users provide company information before reports are analyzed."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company name" value={company.name} help={contextualHelp.companyName} onChange={(value) => updateCompany("name", value)} />
                  <Select label="Industry type" value={company.industry_type} options={industryTypeOptions} help={contextualHelp.industryType} onChange={(value) => updateCompany("industry_type", value)} />
                  <Select label="Revenue range" value={company.revenue_range} options={revenueRangeOptions} help={contextualHelp.revenueRange} onChange={(value) => updateCompany("revenue_range", value)} />
                  <Field label="Employee count" value={company.employee_count} help={contextualHelp.employeeCount} onChange={(value) => updateCompany("employee_count", value)} />
                </div>
              </div>
            )}

            {step === packageStep && (
              <div className="grid gap-5">
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

            {step === dataSourceStep && (
              <div className="grid gap-5">
                <div className="flex items-center gap-2 text-sm font-black text-slate-200">
                  Choose your data path
                  <HelpTip content={contextualHelp.dataSource} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDataSourcePath("connected");
                      setConnectionStatus("idle");
                      setReportSummary({ found: [], missing: accountingReportCatalog });
                      if (!connectedAccountingSystemOptions.includes(company.data_source)) {
                        updateCompany("data_source", "QuickBooks Online");
                      }
                    }}
                    className={`rounded-3xl border p-5 text-left transition ${
                      dataSourcePath === "connected" ? "border-[#FF7A1A]/70 bg-[#FF7A1A]/15" : "border-white/10 bg-[#0A1020] hover:border-white/25"
                    }`}
                  >
                    <p className="text-lg font-black text-white">Connect Accounting System</p>
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
                    <p className="text-lg font-black text-white">Upload Financial Statements</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Fastest route to a free report. No ERP connection required.
                    </p>
                    <p className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">
                      Limited report generated from uploaded financial statements.
                    </p>
                  </button>
                </div>

                {dataSourcePath === "connected" ? (
                  <div className="rounded-3xl border border-white/10 bg-[#0A1020] p-5">
                    <Select
                      label="Accounting system"
                      value={company.data_source}
                      options={connectedAccountingSystemOptions}
                      help={contextualHelp.accountingSystem}
                      onChange={(value) => {
                        updateCompany("data_source", value);
                        setConnectionStatus("idle");
                        setReportSummary({ found: [], missing: accountingReportCatalog });
                      }}
                    />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void validateAccountingConnection()}
                        disabled={connectionStatus === "connecting"}
                        className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {connectionStatus === "connecting" ? "Connecting..." : connectionStatus === "connected" ? "Connection Validated" : "Connect and Validate"}
                      </button>
                      <button type="button" onClick={() => setConnectionValidationOpen(true)} disabled={connectionStatus !== "connected"} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                        View Validation Summary
                      </button>
                    </div>
                    {connectionStatus !== "connected" && (
                      <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
                        Connection is required before continuing. If you do not want to connect now, choose Upload Financial Statements.
                      </p>
                    )}
                    {connectionStatus === "connected" && (
                      <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
                    )}
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ComparisonList
                        title="Connected Accounting System"
                        items={["Full one-time free package", "Executive Summary", "Full PDF", "Sample PowerPoint", "Industry Intelligence", "AI Commentary", "Health Score", "Risks and Opportunities", "Weekly Executive Briefs", "Monthly Executive Packages", "Forecasting", "Budgeting"]}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-[#0A1020] p-5">
                    <p className="text-sm font-black text-white">Manual Financial Upload</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Required: Balance Sheet and Income Statement. Optional: AR Aging, AP Aging, and Inventory Report.
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
                    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">Where to find reports</p>
                        <HelpTip content={contextualHelp.dataSource} />
                      </div>
                      <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-3">
                        <p><span className="font-black text-white">QuickBooks Online:</span> Reports, then Business overview for Balance Sheet and Profit and Loss; Who owes you / What you owe for AR and AP aging; Sales and Products/Services for inventory reports.</p>
                        <p><span className="font-black text-white">QuickBooks Desktop:</span> Reports, then Company & Financial for Balance Sheet and Profit & Loss; Customers & Receivables for AR Aging; Vendors & Payables for AP Aging; Inventory for item valuation.</p>
                        <p><span className="font-black text-white">QuickBooks Enterprise:</span> Use the same Desktop report menus plus Advanced Reporting for inventory, job costing, manufacturing, and industry-specific report exports.</p>
                      </div>
                    </div>
                    {manualUploads.balance_sheet && manualUploads.income_statement && (
                      <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} manual />
                    )}
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ComparisonList
                        title="Manual Upload"
                        items={["Limited Free Report", "Balance Sheet analysis", "Income Statement analysis", "AR/AP review if uploaded", "Inventory review if uploaded", "Executive Summary", "KPI Review", "Sample PDF"]}
                      />
                      <ComparisonList
                        title="Connected Accounting System"
                        items={["Full operational intelligence", "Automated updates", "Weekly Executive Briefs", "Monthly Executive Packages", "Forecasting", "Budgeting", "Treasury", "Oversight Review", "Industry Intelligence", "AI Assistant"]}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === deliveryStep && (
              <div className="grid gap-4">
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
              {step < steps.length - 1 ? (
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
      {manualCompanyInfoOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-white/10 bg-[#0A1020] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FFB36F]">Manual Upload Setup</p>
                <h2 className="mt-2 text-2xl font-black">Company Information</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Since no accounting system is connected, Advisacor needs these details before analyzing uploaded financial statements.
                </p>
              </div>
              <button type="button" onClick={() => setManualCompanyInfoOpen(false)} className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-black text-slate-300">
                Close
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Company name" value={company.name} help={contextualHelp.companyName} onChange={(value) => updateCompany("name", value)} />
              <Select label="Industry type" value={company.industry_type} options={industryTypeOptions} help={contextualHelp.industryType} onChange={(value) => updateCompany("industry_type", value)} />
              <Select label="Revenue range" value={company.revenue_range} options={revenueRangeOptions} help={contextualHelp.revenueRange} onChange={(value) => updateCompany("revenue_range", value)} />
              <Field label="Employee count" value={company.employee_count} help={contextualHelp.employeeCount} onChange={(value) => updateCompany("employee_count", value)} />
            </div>
            <button type="button" onClick={() => setManualCompanyInfoOpen(false)} className="mt-5 rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
              Continue to Upload Reports
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
