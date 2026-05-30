"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { HelpTip } from "../../components/HelpTip";
import { SupportHelpButton } from "../../components/SupportHelpButton";
import { SupportTicketForm } from "../../components/SupportTicketForm";
import {
  accountTypeOptions,
  companyPackageOptions,
  connectedAccountingSystemOptions,
  industryTypeOptions,
  manualFinancialUploadReports,
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
      "Company Information",
      "Industry Type",
      "Package Selection",
      "Data Source",
      "Delivery Configuration",
      "Generate First Package",
    ];
  }, []);

  const updateCompany = (key: keyof CompanyForm, value: string) => {
    setCompany((current) => ({ ...current, [key]: value }));
  };

  const companyInfoStep = 1;
  const industryTypeStep = 2;
  const packageStep = 3;
  const dataSourceStep = 4;
  const deliveryStep = 5;
  const generatePackageStep = 6;
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

  const getPrimaryPersonaForAccountType = (selectedAccountType: string) => {
    if (selectedAccountType === "bookkeeper-advisor") return "bookkeeper";
    if (selectedAccountType === "fractional-cfo-firm") return "fractional-cfo";
    return "business-owner";
  };

  const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
                  {index === 0 ? "0" : index}. {label}
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
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Company name" value={company.name} help={contextualHelp.companyName} onChange={(value) => updateCompany("name", value)} />
                <Select label="Revenue range" value={company.revenue_range} options={revenueRangeOptions} help={contextualHelp.revenueRange} onChange={(value) => updateCompany("revenue_range", value)} />
                <Field label="Employee count" value={company.employee_count} help={contextualHelp.employeeCount} onChange={(value) => updateCompany("employee_count", value)} />
              </div>
            )}

            {step === industryTypeStep && (
              <ChoiceGrid
                options={industryTypeOptions.map((industryType) => ({
                  id: industryType,
                  label: industryType,
                  description: "Tailors KPIs, dashboard emphasis, executive summaries, AI commentary, and future benchmarking.",
                }))}
                selected={company.industry_type}
                help={contextualHelp.industryType}
                onSelect={(value) => updateCompany("industry_type", value)}
              />
            )}

            {step === packageStep && (
              <ChoiceGrid
                options={companyPackageOptions.map((option) => ({ id: option.id, label: option.label, description: option.scope.join(", ") }))}
                selected={company.package_level}
                help={contextualHelp.packageSelection}
                onSelect={(value) => updateCompany("package_level", value)}
              />
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
                    onClick={() => {
                      setDataSourcePath("manual_upload");
                      updateCompany("data_source", "Manual Financial Upload");
                    }}
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
                    <Select label="Accounting system" value={company.data_source} options={connectedAccountingSystemOptions} help={contextualHelp.accountingSystem} onChange={(value) => updateCompany("data_source", value)} />
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ComparisonList
                        title="Connected Accounting System"
                        items={["Full operational intelligence", "Automated updates", "Weekly Executive Briefs", "Monthly Executive Packages", "Forecasting", "Budgeting", "Treasury", "Oversight Review", "Industry Intelligence", "AI Assistant"]}
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
                          onChange={(selected) => setManualUploads((current) => ({ ...current, [report.id]: selected }))}
                        />
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <ComparisonList
                        title="Manual Upload"
                        items={["Balance Sheet analysis", "Income Statement analysis", "AR/AP review if uploaded", "Inventory review if uploaded", "Executive Summary", "KPI Review", "Basic Dashboard", "Sample PDF", "Sample PowerPoint Preview", "Sample AI Commentary"]}
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
                </div>
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
                <button type="button" onClick={() => setStep((current) => current + 1)} className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
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
