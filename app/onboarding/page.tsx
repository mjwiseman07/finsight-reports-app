"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import type { ReportDataContext } from "../../lib/integrations/accounting/report-data-context";
import { assertReportPreflight, validateReportPreflight } from "../../lib/reporting/report-preflight-validation";
import { supabase } from "../../lib/supabase";
import { SOLO_BK_STEPS } from "../../lib/onboarding-solo-bk-steps";
import { PaidUserWelcome } from "./_components/PaidUserWelcome";
import { SiteNav } from "../../components/SiteNav";
import { SiteFooter } from "../../components/SiteFooter";
import { headingFont, primaryCtaClass, focusRing } from "../../components/site-ui";
import { qbErrorCopy } from "../../lib/onboarding/qb-error-messages";

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
type IntegrationProviderId = "quickbooks" | "xero" | "netsuite" | "dynamics" | "sage";
type AccountingEntityOption = {
  provider: string;
  externalId: string;
  canonicalId: string;
  name: string;
  tenantOrRealmId?: string;
};
type AccountingSyncDiagnostics = {
  sourceSystem: string;
  tenantName: string;
  accountsCount: number;
  trialBalanceCount: number;
  balanceSheetCount: number;
  incomeStatementCount: number;
  xeroRawAccountsCount?: number;
  xeroMappedAccountsCount?: number;
  xeroRawTrialBalanceFlattenedRowsCount?: number;
  xeroMappedTrialBalanceRowsCount?: number;
  xeroRawBalanceSheetFlattenedRowsCount?: number;
  xeroMappedBalanceSheetRowsCount?: number;
  xeroRawProfitAndLossFlattenedRowsCount?: number;
  xeroMappedIncomeStatementRowsCount?: number;
};

type ActiveReportNormalizedData = {
  sourceSystem?: string;
  adapterName?: string;
  companyId?: string | null;
  connectionId?: string;
  tenantId?: string | null;
  tenantName?: string;
  syncId?: string;
  syncStatus?: string;
  reportPeriod?: unknown;
  lastSyncedAt?: string;
  normalizedAccounts?: unknown[];
  normalizedTrialBalance?: unknown[];
  normalizedBalanceSheet?: unknown[];
  normalizedIncomeStatement?: unknown[];
};

type ActiveReportPayload = {
  sourceSystem?: string;
  adapterName?: string | null;
  tenantName?: string;
  tenantId?: string | null;
  lastSyncedAt?: string;
  connectionId?: string;
  syncId?: string;
  diagnostics?: unknown;
  normalizedData?: ActiveReportNormalizedData | null;
  reportDataContext?: {
    companyId?: string | null;
    connectionId?: string;
    sourceSystem?: string;
    adapterName?: string;
    tenantId?: string | null;
    tenantName?: string;
    syncId?: string;
    reportPeriod?: unknown;
    normalizedData?: ActiveReportNormalizedData;
  } | null;
  preflight?: unknown;
};

type LatestNormalizedResponse = ActiveReportPayload & {
  ok?: boolean;
  error?: string;
  sourceSystem?: string;
  connectionId?: string;
  syncId?: string;
  syncLookupResult?: string;
  tenantId?: string | null;
  tenantName?: string;
  lastSyncedAt?: string;
  reportPeriod?: unknown;
};

type ReportSummarySource = {
  syncId?: string;
  connectionId?: string;
  sourceSystem?: string;
  tenantId?: string | null;
  payload?: ActiveReportPayload | null;
} | null;

type PersistedSyncRecordDebug = {
  syncId?: string;
  syncStatus?: string;
  companyId?: string;
  connectionId?: string;
  tenantId?: string;
};

type ActiveAccountingContext = {
  companyId?: string | null;
  connectionId?: string;
  sourceSystem?: string;
  tenantId?: string | null;
  tenantName?: string;
  latestSuccessfulSyncId?: string;
  latestSyncId?: string;
  latestSyncStatus?: string;
  packageGeneratorExpectedStatus?: string;
  packageGeneratorFoundStatus?: string;
  persistedSyncRecord?: PersistedSyncRecordDebug;
} | null;

type ActiveAccountingContextResponse = LatestNormalizedResponse & {
  activeContext?: ActiveAccountingContext;
  companyId?: string | null;
  latestSuccessfulSyncId?: string;
  latestSyncId?: string;
  latestSyncStatus?: string;
  packageGeneratorExpectedStatus?: string;
  packageGeneratorFoundStatus?: string;
  persistedSyncRecord?: PersistedSyncRecordDebug;
  validationStatus?: string | null;
};

type PackageLookupDebug = {
  syncIdSearched?: string | null;
  connectionIdSearched?: string | null;
  sourceSystemSearched?: string | null;
  tenantIdSearched?: string | null;
  companyIdSearched?: string | null;
  reportPeriodSearched?: unknown;
  latestSuccessfulSyncFound: boolean;
  syncLookupResult?: string;
  latestSyncStatus?: string | null;
  latestSyncId?: string | null;
  packageGeneratorExpectedStatus?: string | null;
  packageGeneratorFoundStatus?: string | null;
  mismatchReasons: string[];
};

function buildEmptyXeroReportPayload(tenantName: string) {
  const source = {
    provider: "xero",
    providerFamily: "xero",
    providerProduct: "xero_accounting",
    externalEntityId: undefined,
  };
  const timestamp = new Date().toISOString();
  const syncId = `lead-xero-${Date.now()}`;
  const normalizedData = {
    sourceSystem: "xero",
    adapterName: "xeroAdapter",
    companyId: null,
    connectionId: `lead:xero:${tenantName}`,
    tenantId: tenantName,
    tenantName,
    syncId,
    reportPeriod: {
      startDate: timestamp.slice(0, 10),
      endDate: timestamp.slice(0, 10),
      label: "Onboarding Xero selection",
    },
    mappedAt: timestamp,
    rawReportsPulled: {
      accounts: false,
      trialBalance: false,
      balanceSheet: false,
      incomeStatement: false,
      arAging: false,
      apAging: false,
    },
    syncStatus: "SUCCESS",
    lastSyncedAt: timestamp,
    normalizedAccounts: [],
    normalizedTransactions: [],
    normalizedTrialBalance: [],
    normalizedBalanceSheet: [
      { label: "Assets", amount: 0, section: "Assets", source },
      { label: "Liabilities", amount: 0, section: "Liabilities", source },
      { label: "Equity", amount: 0, section: "Equity", source },
    ],
    normalizedIncomeStatement: [
      { label: "Revenue", amount: 0, section: "Revenue", source },
      { label: "Expenses", amount: 0, section: "Expenses", source },
    ],
    normalizedARAging: [],
    normalizedAPAging: [],
    normalizedBudgets: [],
    normalizedDepartments: [],
    normalizedLocations: [],
    normalizedClasses: [],
    normalizedProjects: [],
    normalizedVendors: [],
    normalizedCustomers: [],
    validation: {
      readyForReporting: false,
      missingObjects: ["normalizedAccounts", "normalizedTrialBalance"],
      warnings: ["Xero organization selected. Sync required before financial reports can be generated."],
    },
  };
  const diagnostics = {
    sourceSystem: "xero",
    adapterName: "xeroAdapter",
    tenantName,
    accountsCount: 0,
    trialBalanceCount: 0,
    balanceSheetCount: 3,
    incomeStatementCount: 2,
    xeroRawAccountsCount: 0,
    xeroMappedAccountsCount: 0,
    xeroRawTrialBalanceFlattenedRowsCount: 0,
    xeroMappedTrialBalanceRowsCount: 0,
    xeroRawBalanceSheetFlattenedRowsCount: 0,
    xeroMappedBalanceSheetRowsCount: 3,
    xeroRawProfitAndLossFlattenedRowsCount: 0,
    xeroMappedIncomeStatementRowsCount: 2,
  };
  const reportDataContext = {
    companyId: null,
    connectionId: normalizedData.connectionId,
    sourceSystem: "xero",
    adapterName: "xeroAdapter",
    tenantId: tenantName,
    tenantName,
    reportPeriod: normalizedData.reportPeriod,
    normalizedData,
    validationResult: normalizedData.validation,
    syncId,
    generatedAt: timestamp,
    diagnostics,
  };
  const preflight = validateReportPreflight(reportDataContext as ReportDataContext, { requiresLiveData: true });
  return {
    sourceSystem: "xero",
    tenantName,
    lastSyncedAt: timestamp,
    connectionId: normalizedData.connectionId,
    syncId,
    diagnostics,
    normalizedData,
    reportDataContext,
    preflight,
  };
}

function preflightIssueText(error: unknown) {
  const record = error as { message?: string; preflight?: { blockers?: Array<{ code: string; message: string; affected?: string; expected?: string | number; actual?: string | number; variance?: number; recommendedFix?: string }> } };
  const blockers = record?.preflight?.blockers || [];
  if (!blockers.length) return record?.message || "We could not generate this report because the accounting data failed validation. Please review the issues below and sync again.";
  return [
    record.message || "We could not generate this report because the accounting data failed validation. Please review the issues below and sync again.",
    ...blockers.map((issue) => {
      const details = [
        issue.affected ? `affected: ${issue.affected}` : "",
        issue.expected !== undefined ? `expected: ${issue.expected}` : "",
        issue.actual !== undefined ? `actual: ${issue.actual}` : "",
        issue.variance !== undefined ? `variance: ${issue.variance}` : "",
        issue.recommendedFix ? `fix: ${issue.recommendedFix}` : "",
      ].filter(Boolean);
      return `${issue.code}: ${issue.message}${details.length ? ` (${details.join("; ")})` : ""}`;
    }),
  ].join("\n");
}

const accountingIntegrationOptions: Array<{
  id: IntegrationProviderId;
  label: string;
  dataSource: string;
  status: "available" | "coming_soon";
  description: string;
}> = [
  {
    id: "quickbooks",
    label: "QuickBooks",
    dataSource: "QuickBooks Online",
    status: "available",
    description: "Connect QuickBooks Online and import available company and financial report data.",
  },
  {
    id: "xero",
    label: "Xero",
    dataSource: "Xero",
    status: "available",
    description: "Connect Xero, select an organization, sync Demo Company data, and validate normalized reporting readiness.",
  },
  {
    id: "netsuite",
    label: "NetSuite",
    dataSource: "NetSuite",
    status: "coming_soon",
    description: "Enterprise ERP connection coming soon.",
  },
  {
    id: "dynamics",
    label: "Microsoft Dynamics",
    dataSource: "Microsoft Dynamics",
    status: "coming_soon",
    description: "Business Central and Dynamics finance connection coming soon.",
  },
  {
    id: "sage",
    label: "Sage Intacct",
    dataSource: "Sage",
    status: "coming_soon",
    description: "Sage Intacct connection coming soon.",
  },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const persona = searchParams?.get("persona") || "";
  const isSoloBookkeeperPersona = persona === "bookkeeper";
  const templateId = searchParams?.get("companyTemplate") || "";
  const isSuperAdmin = searchParams?.get("superAdmin") === "true";
  const template = demoTemplates[templateId] || {};
  const queryLeadId = searchParams?.get("leadId") || "";
  const queryProvider = searchParams?.get("provider") === "xero" ? "xero" : searchParams?.get("provider") === "quickbooks" ? "quickbooks" : "quickbooks";
  const startsOnConnectAccounting = searchParams?.get("step") === "connect-accounting";
  const qbErrorCode = searchParams?.get("qbError") || null;
  // Internal debug panels are hidden from end users. Set NEXT_PUBLIC_SHOW_ONBOARDING_DEBUG=true
  // in a staging/local env to render them for support triage.
  const isStaffViewer = process.env.NEXT_PUBLIC_SHOW_ONBOARDING_DEBUG === "true";

  // Phase TCP1 W2.5 Block 9j — TIER AWARENESS
  // Paid users bypass all free-review-lead gates and see PaidUserWelcome.
  const [onboardingContext, setOnboardingContext] = useState<{
    auth: boolean;
    is_paid_user: boolean;
    tier_key: string | null;
    email: string | null;
    active_paid_slot: {
      id: string;
      tier_key: string;
      pilot_status: string;
      stripe_subscription_id: string | null;
    } | null;
  } | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const checkoutSuccessPending =
    searchParams?.get("checkout") === "success" || searchParams?.get("paid") === "1";

  useEffect(() => {
    let cancelled = false;
    const emptyContext = {
      auth: false,
      is_paid_user: false,
      tier_key: null,
      email: null,
      active_paid_slot: null,
    };

    const loadContext = async () => {
      try {
        const response = await fetch("/api/onboarding/context", { credentials: "include" });
        const data = await response.json();
        if (cancelled) return data;
        setOnboardingContext(data);
        return data;
      } catch {
        if (cancelled) return emptyContext;
        setOnboardingContext(emptyContext);
        return emptyContext;
      }
    };

    (async () => {
      // After Stripe redirect, webhook may lag — poll briefly before treating as unpaid.
      const maxAttempts = checkoutSuccessPending ? 12 : 1;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const data = await loadContext();
        if (cancelled) return;
        if (data?.is_paid_user) {
          setContextLoading(false);
          return;
        }
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      }
      if (!cancelled) setContextLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutSuccessPending]);

  const isPaidUser = Boolean(onboardingContext?.is_paid_user);
  const paidTierKey = onboardingContext?.tier_key ?? null;

  const [step, setStep] = useState(startsOnConnectAccounting ? 1 : 0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [firstPackageReady, setFirstPackageReady] = useState(false);
  const [firstPackageSession, setFirstPackageSession] = useState<Record<string, unknown>>({});
  const [supportOpen, setSupportOpen] = useState(false);
  const [manualCompanySetupVisible, setManualCompanySetupVisible] = useState(template.accounting_system === "Manual Financial Upload");
  const [packageStatusIndex, setPackageStatusIndex] = useState(0);
  const hasTrackedStart = useRef(false);
  const hasResumedProviderConnect = useRef(false);
  const activeContextHydrationKey = useRef("");
  const firstReviewSyncTriggered = useRef(false);
  const [firstReviewSyncState, setFirstReviewSyncState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const firstReviewMilestones =
    firstReviewSyncState === "ready"
      ? ["Fetching Balance Sheet", "Fetching Income Statement", "Fetching Trial Balance", "Ready"]
      : ["Fetching Balance Sheet", "Fetching Income Statement", "Fetching Trial Balance"];
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
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationProviderId>(queryProvider);
  const [connectedIntegration, setConnectedIntegration] = useState<IntegrationProviderId | null>(null);
  const [connectedOrganizationName, setConnectedOrganizationName] = useState("");
  const [connectedLastSync, setConnectedLastSync] = useState("");
  const [connectedConnectionId, setConnectedConnectionId] = useState("");
  const [syncDiagnostics, setSyncDiagnostics] = useState<AccountingSyncDiagnostics | null>(null);
  const [isSyncingIntegration, setIsSyncingIntegration] = useState(false);
  const [xeroEntities, setXeroEntities] = useState<AccountingEntityOption[]>([]);
  const [isLoadingXeroEntities, setIsLoadingXeroEntities] = useState(false);
  const [hasOnboardingSession, setHasOnboardingSession] = useState(false);
  const [connectionValidationOpen, setConnectionValidationOpen] = useState(false);
  const [freeReviewLeadId, setFreeReviewLeadId] = useState(queryLeadId);
  const [reportSummary, setReportSummary] = useState<ReportSummary>({ found: [], missing: accountingReportCatalog });
  const [reportSummarySource, setReportSummarySource] = useState<ReportSummarySource>(null);
  const [packageContextSource, setPackageContextSource] = useState<ReportSummarySource>(null);
  const [activeAccountingContext, setActiveAccountingContext] = useState<ActiveAccountingContext>(null);
  const [packageLookupDebug, setPackageLookupDebug] = useState<PackageLookupDebug>({
    latestSuccessfulSyncFound: false,
    syncLookupResult: "not_checked",
    mismatchReasons: [],
  });
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
    if (isSoloBookkeeperPersona) {
      return SOLO_BK_STEPS.map((s) => s.label);
    }
    return [
      "Customer Type Selection",
      "Connect Accounting",
      "Upload Financial Reports",
      "Select Industry",
      "Configure Pulse",
      "Generate First Review",
      "Dashboard",
    ];
  }, [isSoloBookkeeperPersona]);

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

  const getSelectedIntegrationOption = () =>
    accountingIntegrationOptions.find((option) => option.id === selectedIntegration) || accountingIntegrationOptions[0];

  const getSelectedConnectUrl = (integration: IntegrationProviderId = selectedIntegration) =>
    integration === "xero" ? "/api/integrations/xero/connect" : "/api/integrations/quickbooks/connect";

  const providerReportPayloadKey = (provider: IntegrationProviderId) => `advisacor_${provider}_report_payload`;

  const parseReportPayload = (value: string | null): ActiveReportPayload | null => {
    try {
      return JSON.parse(value || "null") as ActiveReportPayload | null;
    } catch {
      return null;
    }
  };

  const payloadSourceSystem = (payload: ActiveReportPayload | null) =>
    payload?.reportDataContext?.sourceSystem || payload?.normalizedData?.sourceSystem || payload?.sourceSystem || "";

  const payloadConnectionId = (payload: ActiveReportPayload | null) =>
    payload?.reportDataContext?.connectionId || payload?.normalizedData?.connectionId || payload?.connectionId || "";

  const payloadTenantId = (payload: ActiveReportPayload | null) =>
    payload?.reportDataContext?.tenantId || payload?.normalizedData?.tenantId || payload?.tenantId || "";

  const payloadMatchesSelectedConnection = (provider: IntegrationProviderId, payload: ActiveReportPayload | null, expectedConnectionId = connectedConnectionId) => {
    if (!payload || payloadSourceSystem(payload) !== provider) return false;
    const actualConnectionId = payloadConnectionId(payload);
    if (expectedConnectionId && actualConnectionId && expectedConnectionId !== actualConnectionId) return false;
    const expectedTenantId = activeAccountingContext?.tenantId || "";
    const actualTenantId = payloadTenantId(payload);
    if (expectedTenantId && actualTenantId && expectedTenantId !== actualTenantId) return false;
    return true;
  };

  const clearReportContext = () => {
    window.localStorage.removeItem("advisacor_active_report_payload");
    window.sessionStorage.removeItem("advisacor_active_report_payload");
    setSyncDiagnostics(null);
    setConnectionValidationOpen(false);
    setReportSummarySource(null);
    setPackageContextSource(null);
    setActiveAccountingContext(null);
    setPackageLookupDebug({
      latestSuccessfulSyncFound: false,
      syncLookupResult: "not_checked",
      mismatchReasons: [],
    });
  };

  const setReportContextForProvider = (provider: IntegrationProviderId, payload: ActiveReportPayload | null) => {
    if (!payloadMatchesSelectedConnection(provider, payload)) return null;
    const safePayload = payload as ActiveReportPayload;
    window.localStorage.setItem("advisacor_active_report_payload", JSON.stringify(safePayload));
    window.localStorage.setItem(providerReportPayloadKey(provider), JSON.stringify(safePayload));
    setSyncDiagnostics((safePayload.diagnostics as AccountingSyncDiagnostics | null) || null);
    const nextSource = {
      syncId: safePayload.syncId || safePayload.reportDataContext?.syncId,
      connectionId: safePayload.connectionId || safePayload.reportDataContext?.connectionId,
      sourceSystem: safePayload.sourceSystem || safePayload.reportDataContext?.sourceSystem,
      tenantId: safePayload.tenantId || safePayload.reportDataContext?.tenantId || null,
      payload: safePayload,
    };
    setReportSummarySource(nextSource);
    setPackageContextSource(nextSource);
    setActiveAccountingContext({
      companyId: safePayload.reportDataContext?.companyId || safePayload.normalizedData?.companyId || null,
      connectionId: nextSource.connectionId,
      sourceSystem: nextSource.sourceSystem,
      tenantId: nextSource.tenantId,
      tenantName: safePayload.tenantName || safePayload.reportDataContext?.tenantName || safePayload.normalizedData?.tenantName,
      latestSuccessfulSyncId: nextSource.syncId,
      latestSyncId: nextSource.syncId,
      latestSyncStatus: safePayload.normalizedData?.syncStatus || "SUCCESS",
      packageGeneratorExpectedStatus: "SUCCESS",
      packageGeneratorFoundStatus: safePayload.normalizedData?.syncStatus || "SUCCESS",
    });
    return safePayload;
  };

  const setPackageContextForProvider = (provider: IntegrationProviderId, payload: ActiveReportPayload | null) => {
    if (!payloadMatchesSelectedConnection(provider, payload)) return null;
    const safePayload = payload as ActiveReportPayload;
    const nextSource = {
      syncId: safePayload.syncId || safePayload.reportDataContext?.syncId,
      connectionId: safePayload.connectionId || safePayload.reportDataContext?.connectionId,
      sourceSystem: safePayload.sourceSystem || safePayload.reportDataContext?.sourceSystem,
      tenantId: safePayload.tenantId || safePayload.reportDataContext?.tenantId || null,
      payload: safePayload,
    };
    window.localStorage.setItem("advisacor_active_report_payload", JSON.stringify(safePayload));
    setPackageContextSource(nextSource);
    setActiveAccountingContext((current) => ({
      companyId: safePayload.reportDataContext?.companyId || safePayload.normalizedData?.companyId || current?.companyId || null,
      connectionId: nextSource.connectionId,
      sourceSystem: nextSource.sourceSystem,
      tenantId: nextSource.tenantId,
      tenantName: safePayload.tenantName || safePayload.reportDataContext?.tenantName || safePayload.normalizedData?.tenantName || current?.tenantName,
      latestSuccessfulSyncId: nextSource.syncId,
      latestSyncId: nextSource.syncId || current?.latestSyncId,
      latestSyncStatus: safePayload.normalizedData?.syncStatus || current?.latestSyncStatus,
      packageGeneratorExpectedStatus: "SUCCESS",
      packageGeneratorFoundStatus: safePayload.normalizedData?.syncStatus || current?.packageGeneratorFoundStatus,
    }));
    return safePayload;
  };

  const reportPayloadCompanyId = (payload: ActiveReportPayload | null) =>
    payload?.reportDataContext?.companyId || payload?.normalizedData?.companyId || null;

  const reportPayloadReportPeriod = (payload: ActiveReportPayload | null) =>
    payload?.reportDataContext?.reportPeriod || payload?.normalizedData?.reportPeriod || null;

  const hydrateActiveAccountingContext = async (provider: IntegrationProviderId = selectedIntegration, connectionId = connectedConnectionId, options: { forceRefresh?: boolean } = {}) => {
    const token = await getAuthToken();
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    if (!token && !leadId) return null;
    const buildRequestBody = (nextConnectionId = connectionId) => JSON.stringify({
      companyId: activeAccountingContext?.companyId || null,
      connectionId: nextConnectionId,
      sourceSystem: provider,
      leadId,
      forceRefresh: provider === "xero" ? Boolean(options.forceRefresh) : false,
    });
    let response = await fetch("/api/accounting/active-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: buildRequestBody(),
    });
    let result = await response.json().catch(() => ({})) as ActiveAccountingContextResponse & { error?: string };
    if (!response.ok && response.status === 404 && provider !== "xero" && connectionId) {
      response = await fetch("/api/accounting/active-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: buildRequestBody(""),
      });
      result = await response.json().catch(() => ({})) as ActiveAccountingContextResponse & { error?: string };
    }
    if (!response.ok) {
      if (provider === "xero" && options.forceRefresh) {
        throw new Error(result.error || "Unable to refresh Xero report context before PDF generation.");
      }
      return null;
    }
    const context = result.activeContext || {
      companyId: result.companyId,
      connectionId: result.connectionId,
      sourceSystem: result.sourceSystem,
      tenantId: result.tenantId,
      tenantName: result.tenantName,
      latestSuccessfulSyncId: result.latestSuccessfulSyncId || result.syncId,
        latestSyncId: result.latestSyncId,
        latestSyncStatus: result.latestSyncStatus,
        packageGeneratorExpectedStatus: result.packageGeneratorExpectedStatus,
        packageGeneratorFoundStatus: result.packageGeneratorFoundStatus,
        persistedSyncRecord: result.persistedSyncRecord,
    };
    setActiveAccountingContext(context);
    if (context?.connectionId) setConnectedConnectionId(context.connectionId);
    if (context?.sourceSystem) setConnectedIntegration(context.sourceSystem as IntegrationProviderId);
    if (context?.tenantName) setConnectedOrganizationName(context.tenantName);
    if (result.lastSyncedAt) setConnectedLastSync(result.lastSyncedAt);
    console.info("Hydrated Context:", {
      companyId: context?.companyId || null,
      connectionId: context?.connectionId || null,
      tenantId: context?.tenantId || null,
      syncId: context?.latestSuccessfulSyncId || null,
        latestSyncStatus: context?.latestSyncStatus || null,
      forceRefresh: provider === "xero" ? Boolean(options.forceRefresh) : false,
    });
    const payload: ActiveReportPayload | null = result.normalizedData || result.reportDataContext
      ? {
          sourceSystem: context?.sourceSystem || result.sourceSystem || provider,
          adapterName: result.normalizedData?.adapterName || result.reportDataContext?.adapterName || null,
          tenantId: context?.tenantId || result.tenantId || result.normalizedData?.tenantId || result.reportDataContext?.tenantId || null,
          tenantName: context?.tenantName || result.tenantName || result.normalizedData?.tenantName || result.reportDataContext?.tenantName || "",
          lastSyncedAt: result.lastSyncedAt || result.normalizedData?.lastSyncedAt || "",
          connectionId: context?.connectionId || result.connectionId || connectionId,
          syncId: context?.latestSuccessfulSyncId || result.syncId || result.reportDataContext?.syncId || "",
          diagnostics: result.diagnostics || null,
          normalizedData: result.normalizedData || null,
          reportDataContext: result.reportDataContext || null,
          preflight: null,
        }
      : null;
    if (payload) {
      setReportContextForProvider(provider, payload);
      setPackageLookupDebug({
        syncIdSearched: payload.syncId || null,
        connectionIdSearched: payload.connectionId || null,
        sourceSystemSearched: payload.sourceSystem || provider,
        tenantIdSearched: payload.tenantId || null,
        companyIdSearched: reportPayloadCompanyId(payload),
        reportPeriodSearched: reportPayloadReportPeriod(payload),
        latestSuccessfulSyncFound: Boolean(payload.syncId),
        syncLookupResult: payload.syncId ? "active context hydrated" : "active context missing sync",
        latestSyncStatus: context?.latestSyncStatus || null,
        latestSyncId: context?.latestSyncId || context?.latestSuccessfulSyncId || null,
        packageGeneratorExpectedStatus: context?.packageGeneratorExpectedStatus || "SUCCESS",
        packageGeneratorFoundStatus: context?.packageGeneratorFoundStatus || null,
        mismatchReasons: payload.syncId ? [] : ["sync status mismatch"],
      });
    }
    return payload;
  };

  const fetchLatestSyncForProvider = async (provider: IntegrationProviderId, connectionId: string, fallbackPayload: ActiveReportPayload | null = null) => {
    const nextPayload = await hydrateActiveAccountingContext(provider, connectionId);
    if (!nextPayload) return setReportContextForProvider(provider, fallbackPayload);
    console.info("[onboarding/provider-switch] loaded latest sync", {
      selectedProvider: provider,
      previousNormalizedSource: payloadSourceSystem(fallbackPayload) || null,
      newNormalizedSource: payloadSourceSystem(nextPayload) || null,
      loadedSyncId: nextPayload.syncId || nextPayload.reportDataContext?.syncId || null,
      loadedConnectionId: payloadConnectionId(nextPayload) || null,
    });
    return setReportContextForProvider(provider, nextPayload);
  };

  const onProviderChange = (provider: IntegrationProviderId) => {
    const previousPayload = parseReportPayload(window.localStorage.getItem("advisacor_active_report_payload"));
    const providerPayload = parseReportPayload(window.localStorage.getItem(providerReportPayloadKey(provider)));
    const providerConnectionId =
      (connectedIntegration === provider ? connectedConnectionId : "") ||
      payloadConnectionId(providerPayload) ||
      window.localStorage.getItem(`advisacor_onboarding_${provider}_connection_id`) ||
      "";
    console.info("[onboarding/provider-switch]", {
      selectedProvider: provider,
      previousNormalizedSource: payloadSourceSystem(previousPayload) || null,
      newNormalizedSource: payloadSourceSystem(providerPayload) || null,
      loadedSyncId: providerPayload?.syncId || providerPayload?.reportDataContext?.syncId || null,
      loadedConnectionId: providerConnectionId || null,
    });
    setSelectedIntegration(provider);
    setDataSourcePath("connected");
    setManualCompanySetupVisible(false);
    setMessage("");
    setReportSummary({ found: [], missing: accountingReportCatalog });
    if (connectedIntegration !== provider) {
      setConnectedIntegration(providerPayload || providerConnectionId ? provider : null);
      setConnectedOrganizationName(providerPayload?.tenantName || providerPayload?.normalizedData?.tenantName || providerPayload?.reportDataContext?.tenantName || "");
      setConnectedConnectionId(providerConnectionId);
      setConnectedLastSync(providerPayload?.lastSyncedAt || providerPayload?.normalizedData?.lastSyncedAt || "");
      setConnectionStatus(providerPayload || providerConnectionId ? "connected" : "idle");
    }
    clearReportContext();
    void fetchLatestSyncForProvider(provider, providerConnectionId, providerPayload);
  };

  const selectIntegration = (integration: IntegrationProviderId) => {
    const option = accountingIntegrationOptions.find((item) => item.id === integration) || accountingIntegrationOptions[0];
    onProviderChange(integration);
    updateCompany("data_source", option.dataSource);
    updateCompany("accounting_system", option.dataSource);
  };

  const buildProviderLoginReturnUrl = (integration: IntegrationProviderId) => {
    const returnUrl = new URL(getSelectedConnectUrl(integration), window.location.origin);
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    console.log("[onboarding/accounting-connect] login return prepared", {
      selectedProvider: integration,
      returnTo: returnUrl.pathname,
      hasLeadId: Boolean(leadId),
    });
    return returnUrl.pathname;
  };

  const writeAccountingConnectCookies = (integration: IntegrationProviderId, token: string) => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set("accountingConnected", "true");
    returnUrl.searchParams.set("provider", integration);
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    document.cookie = `advisacor_oauth_token=${encodeURIComponent(token)}; path=/; max-age=600; SameSite=Lax`;
    document.cookie = `advisacor_oauth_return_to=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}; path=/; max-age=600; SameSite=Lax`;
    if (leadId) document.cookie = `advisacor_oauth_lead_id=${encodeURIComponent(leadId)}; path=/; max-age=600; SameSite=Lax`;
  };

  const refreshAccountingConnectSessionCookie = async () => {
    const token = await getAuthToken();
    if (token) {
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("accountingConnected", "true");
      returnUrl.searchParams.set("provider", selectedIntegration);
      document.cookie = `advisacor_oauth_token=${encodeURIComponent(token)}; path=/; max-age=600; SameSite=Lax`;
      document.cookie = `advisacor_oauth_return_to=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}; path=/; max-age=600; SameSite=Lax`;
    }
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    if (leadId) document.cookie = `advisacor_oauth_lead_id=${encodeURIComponent(leadId)}; path=/; max-age=600; SameSite=Lax`;
    return token;
  };

  const applyConnectedIntegration = ({
    integration,
    organizationName,
    connectionId = "",
  }: {
    integration: IntegrationProviderId;
    organizationName: string;
    connectionId?: string;
  }) => {
    const option = accountingIntegrationOptions.find((item) => item.id === integration) || accountingIntegrationOptions[0];
    const connectedProfile = {
      ...company,
      name: integration === "xero" && organizationName ? organizationName : company.name || organizationName || `${option.label} Company`,
      industry_type: company.industry_type || "Professional Services",
      revenue_range: company.revenue_range || "$1M-$5M",
      fiscal_year: company.fiscal_year || "Calendar Year",
      employee_count: company.employee_count || "10",
      data_source: option.dataSource,
      accounting_system: option.dataSource,
    };
    const discovery = buildReportDiscovery(option.dataSource);
    const hasRequiredReports = hasRequiredFinancialReports(discovery);
    setSelectedIntegration(integration);
    setConnectedIntegration(integration);
    setConnectedOrganizationName(organizationName || connectedProfile.name);
    setConnectedConnectionId(connectionId);
    setConnectedLastSync(new Date().toISOString());
    setSyncDiagnostics(null);
    setDataSourcePath("connected");
    setConnectionStatus("connected");
    setCompany(connectedProfile);
    setReportSummary(discovery);
    applyRecommendation(discovery.found);
    setManualCompanySetupVisible(!hasCompanyProfileFields(connectedProfile));
    setConnectionValidationOpen(!hasRequiredReports);
    setStep(hasRequiredReports ? industryStep : uploadReportsStep);
    setMessage(`${option.label} connected successfully. Advisacor will use normalized financial data from this integration.`);
    void enrichFreeReviewLead({
      status: `${integration}_connected`,
      nextCompany: connectedProfile,
      nextReportSummary: discovery,
    });
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

  useEffect(() => {
    void getAuthToken().then((token) => {
      if (token) {
        const returnUrl = new URL(window.location.href);
        returnUrl.searchParams.set("accountingConnected", "true");
        returnUrl.searchParams.set("provider", selectedIntegration);
        document.cookie = `advisacor_oauth_token=${encodeURIComponent(token)}; path=/; max-age=600; SameSite=Lax`;
        document.cookie = `advisacor_oauth_return_to=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}; path=/; max-age=600; SameSite=Lax`;
      }
      window.requestAnimationFrame(() => setHasOnboardingSession(Boolean(token)));
      console.log("[onboarding/accounting-connect] onboarding user/session status", {
        authenticated: Boolean(token),
        selectedProvider: selectedIntegration,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIntegration]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isSuperAdmin) return;
    // Phase TCP1 W2.5 Block 9j — paid users never bounce to free-review.
    if (isPaidUser) return;
    if (contextLoading) return;
    // Hold the gate while Stripe webhook may still be writing pilot_slots.
    if (checkoutSuccessPending) return;
    const storedLeadId = window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    const nextLeadId = queryLeadId || storedLeadId;
    const isProviderConnectResume = searchParams?.get("step") === "connect-accounting" && ["xero", "quickbooks"].includes(searchParams?.get("provider") || "");
    if (!nextLeadId) {
      if (isProviderConnectResume) {
        console.log("[onboarding/accounting-connect] no lead gate bypassed for provider connect resume", {
          selectedProvider: searchParams?.get("provider"),
          hasStoredLeadId: false,
        });
        return;
      }
      router.replace("/free-review?source=onboarding-gate");
      return;
    }
    setFreeReviewLeadId(nextLeadId);
    window.localStorage.setItem("advisacor_free_review_lead_id", nextLeadId);
  }, [isSuperAdmin, isPaidUser, contextLoading, checkoutSuccessPending, queryLeadId, router, searchParams]);

  // Phase TCP1 W2.5 Block 9j — paid manual-upload entry.
  useEffect(() => {
    if (!isPaidUser) return;
    if (searchParams?.get("step") !== "manual-upload") return;
    setDataSourcePath("manual_upload");
    setManualCompanySetupVisible(true);
    setStep(1);
  }, [isPaidUser, searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (searchParams?.get("quickBooksConnected") !== "true") return;
    const connectionId = searchParams?.get("connectionId") || "";
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
    setSelectedIntegration("quickbooks");
    setConnectedIntegration("quickbooks");
    if (connectionId) setConnectedConnectionId(connectionId);
    setConnectedOrganizationName(importedQuickBooksProfile.name);
    setCompany(importedQuickBooksProfile);
    const discovery = buildReportDiscovery("QuickBooks Online");
    const hasRequiredReports = hasRequiredFinancialReports(discovery);
    setReportSummary(discovery);
    applyRecommendation(discovery.found);
    setManualCompanySetupVisible(!hasCompanyProfileFields(importedQuickBooksProfile));
    setConnectionValidationOpen(!hasRequiredReports);
    setStep(hasRequiredReports ? industryStep : uploadReportsStep);
    window.localStorage.setItem("advisacor_onboarding_quickbooks_connected", "true");
    if (connectionId) window.localStorage.setItem("advisacor_onboarding_quickbooks_connection_id", connectionId);
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (searchParams?.get("accountingConnected") !== "true" || searchParams?.get("provider") !== "xero") return;
    const connectionId = searchParams?.get("connectionId") || "";
    const requiresOrganizationSelection = searchParams?.get("xeroOrganizationSelection") === "required";
    if (requiresOrganizationSelection) {
      const option = accountingIntegrationOptions.find((item) => item.id === "xero") || accountingIntegrationOptions[0];
      const discovery = buildReportDiscovery(option.dataSource);
      setSelectedIntegration("xero");
      setConnectedIntegration("xero");
      setConnectedOrganizationName("Select a Xero organization");
      setConnectedConnectionId(connectionId);
      setConnectedLastSync("");
      setSyncDiagnostics(null);
      setDataSourcePath("connected");
      setConnectionStatus("connected");
      setReportSummary(discovery);
      applyRecommendation(discovery.found);
      setManualCompanySetupVisible(false);
      setConnectionValidationOpen(false);
      setStep(connectQuickBooksStep);
      window.localStorage.setItem("advisacor_onboarding_xero_connected", "true");
      if (connectionId) window.localStorage.setItem("advisacor_onboarding_xero_connection_id", connectionId);
      void loadXeroEntities(connectionId);
      setMessage(`Xero authorized ${searchParams?.get("xeroOrganizationCount") || "multiple"} organizations. Select the organization to use inside Advisacor before syncing.`);
      return;
    }
    applyConnectedIntegration({
      integration: "xero",
      organizationName: searchParams?.get("organizationName") || "Xero Organization",
      connectionId,
    });
    window.localStorage.setItem("advisacor_onboarding_xero_connected", "true");
    if (connectionId) window.localStorage.setItem("advisacor_onboarding_xero_connection_id", connectionId);
    if (connectionId) void loadXeroEntities(connectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (connectionStatus !== "connected") return;
    const providerConnectionId =
      connectedConnectionId ||
      window.localStorage.getItem(`advisacor_onboarding_${selectedIntegration}_connection_id`) ||
      "";
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    const hydrationKey = `${selectedIntegration}:${providerConnectionId}:${leadId}`;
    if (activeContextHydrationKey.current === hydrationKey) return;
    activeContextHydrationKey.current = hydrationKey;
    void hydrateActiveAccountingContext(selectedIntegration, providerConnectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, connectedConnectionId, selectedIntegration, freeReviewLeadId]);

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

  const validateAccountingConnection = async (integration: IntegrationProviderId = selectedIntegration) => {
    setError("");
    setMessage("");
    console.log("[onboarding/accounting-connect] connect clicked", {
      selectedProvider: integration,
      companyDataSource: company.data_source,
      currentStep: step,
      connectUrl: getSelectedConnectUrl(integration),
    });
    if (integration === "xero") {
      const token = await getAuthToken();
      console.log("[onboarding/accounting-connect] session status", {
        selectedProvider: integration,
        authenticated: Boolean(token),
      });
      if (!token) {
        const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
        if (leadId) {
          const returnUrl = new URL(window.location.href);
          returnUrl.searchParams.set("accountingConnected", "true");
          returnUrl.searchParams.set("provider", "xero");
          document.cookie = `advisacor_oauth_lead_id=${encodeURIComponent(leadId)}; path=/; max-age=600; SameSite=Lax`;
          document.cookie = `advisacor_oauth_return_to=${encodeURIComponent(`${returnUrl.pathname}${returnUrl.search}`)}; path=/; max-age=600; SameSite=Lax`;
          console.log("[onboarding/accounting-connect] starting Xero OAuth in lead mode", {
            selectedProvider: integration,
            connectUrl: getSelectedConnectUrl("xero"),
            session: false,
            hasLeadId: true,
            loginRedirectTriggered: false,
          });
          window.location.assign(getSelectedConnectUrl("xero"));
          return;
        }
        const nextPath = buildProviderLoginReturnUrl("xero");
        console.log("[onboarding/accounting-connect] redirecting to login", {
          selectedProvider: integration,
          loginRedirectTriggered: true,
          returnTo: nextPath,
        });
        setError("Sign in first, then connect Xero.");
        router.push(`/signin?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const connectUrl = getSelectedConnectUrl("xero");
      writeAccountingConnectCookies("xero", token);
      console.log("[onboarding/accounting-connect] starting Xero OAuth", {
        selectedProvider: integration,
        connectUrl,
        returnTo: document.cookie.includes("advisacor_oauth_return_to") ? "cookie:set" : "cookie:missing",
        loginRedirectTriggered: false,
      });
      window.location.assign(connectUrl);
      return;
    }

    if (integration === "quickbooks" || company.data_source === "QuickBooks Online") {
      const token = await getAuthToken();
      console.log("[onboarding/accounting-connect] session status", {
        selectedProvider: integration,
        authenticated: Boolean(token),
      });
      const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
      if (!token && !leadId && !isPaidUser) {
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
      const connectUrl = `/api/integrations/quickbooks/connect?${connectParams.toString()}`;
      console.log("[onboarding/accounting-connect] starting QuickBooks OAuth", {
        selectedProvider: integration,
        connectUrl,
        returnTo: connectParams.get("returnTo"),
        loginRedirectTriggered: false,
      });
      const response = await fetch(connectUrl, {
        method: "GET",
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

  const loadXeroEntities = async (connectionId = connectedConnectionId) => {
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    if (!connectionId && !leadId) return;
    setIsLoadingXeroEntities(true);
    setError("");

    try {
      const token = await getAuthToken();
      if (!token && !leadId) {
        setError("Sign in again to load Xero organizations.");
        return;
      }
      const response =
        token && connectionId
          ? await fetch(`/api/accounting/entities?connectionId=${encodeURIComponent(connectionId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : await fetch(`/api/integrations/xero/lead-entities?leadId=${encodeURIComponent(leadId)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Unable to load Xero organizations.");
        return;
      }
      setXeroEntities(result.entities || []);
      if ((result.entities || []).length === 1) {
        setMessage("Xero connected. Select the organization below, then sync.");
      }
    } finally {
      setIsLoadingXeroEntities(false);
    }
  };

  const selectXeroEntity = async (entity: AccountingEntityOption) => {
    setError("");
    setMessage("");
    const token = await getAuthToken();
    const leadId = freeReviewLeadId || window.localStorage.getItem("advisacor_free_review_lead_id") || "";
    if (!token && !leadId && !isPaidUser) {
      setError("Sign in again to select a Xero organization.");
      return;
    }
    const response =
      token && connectedConnectionId
        ? await fetch("/api/accounting/select-entity", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              connectionId: connectedConnectionId,
              entityId: entity.canonicalId || entity.externalId,
            }),
          })
        : await fetch("/api/integrations/xero/select-lead-entity", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              leadId,
              entityId: entity.canonicalId || entity.externalId,
            }),
          });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to select Xero organization.");
      return;
    }
    applyConnectedIntegration({
      integration: "xero",
      organizationName: result.entity?.name || entity.name,
      connectionId: result.connectionId || connectedConnectionId,
    });
    const reportPayload = buildEmptyXeroReportPayload(result.entity?.name || entity.name);
    window.localStorage.setItem("advisacor_active_report_payload", JSON.stringify({
      ...reportPayload,
      connectionId: result.connectionId || reportPayload.connectionId,
      normalizedData: {
        ...reportPayload.normalizedData,
        connectionId: result.connectionId || reportPayload.normalizedData.connectionId,
      },
      reportDataContext: {
        ...reportPayload.reportDataContext,
        connectionId: result.connectionId || reportPayload.reportDataContext.connectionId,
      },
    }));
  };

  const syncConnectedIntegration = async () => {
    if (!connectedConnectionId) return false;
    setIsSyncingIntegration(true);
    setError("");
    setMessage("");

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Sign in again to sync your accounting data.");
        return false;
      }
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
      const response = await fetch("/api/accounting/fetch-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          connectionId: connectedConnectionId,
          sourceSystem: selectedIntegration,
          selectedProvider: selectedIntegration,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (selectedIntegration === "xero" && result.diagnostics) {
          setSyncDiagnostics(result.diagnostics);
        }
        setError(result.preflight ? preflightIssueText({ message: result.error, preflight: result.preflight }) : result.error || "Unable to sync accounting data.");
        return false;
      }
      if (selectedIntegration === "xero" && result.normalizedData?.sourceSystem !== "xero") {
        setError(`Provider mismatch: active xero but normalized data is ${result.normalizedData?.sourceSystem || "unknown"}`);
        return false;
      }
      setConnectedLastSync(result.normalizedData?.lastSyncedAt || new Date().toISOString());
      setSyncDiagnostics(result.diagnostics || null);
      const syncedPayload = {
        sourceSystem: result.normalizedData?.sourceSystem || selectedIntegration,
        adapterName: result.normalizedData?.adapterName || result.reportDataContext?.adapterName || null,
        tenantId: result.normalizedData?.tenantId || result.reportDataContext?.tenantId || null,
        tenantName: result.diagnostics?.tenantName || connectedOrganizationName,
        lastSyncedAt: result.normalizedData?.lastSyncedAt || new Date().toISOString(),
        connectionId: connectedConnectionId,
        syncId: result.syncId || result.reportDataContext?.syncId || "",
        diagnostics: result.diagnostics || null,
        normalizedData: result.normalizedData || null,
        reportDataContext: result.reportDataContext || null,
        preflight: result.preflight || null,
      };
      setReportContextForProvider(selectedIntegration, syncedPayload);
      await hydrateActiveAccountingContext(selectedIntegration, connectedConnectionId);
      if (connectedConnectionId) window.localStorage.setItem(`advisacor_onboarding_${selectedIntegration}_connection_id`, connectedConnectionId);
      console.info("Connected Reports Summary Source:", {
        syncId: syncedPayload.syncId,
        connectionId: syncedPayload.connectionId,
        sourceSystem: syncedPayload.sourceSystem,
        tenantId: syncedPayload.tenantId,
      });
      setConnectionValidationOpen(true);
      setMessage(result.message || `${getSelectedIntegrationOption().label} sync completed and normalized data validation passed.`);
      return true;
    } finally {
      setIsSyncingIntegration(false);
    }
  };

  const disconnectConnectedIntegration = async () => {
    if (!connectedConnectionId || connectedIntegration !== "xero") return;
    setError("");
    setMessage("");
    const token = await getAuthToken();
    if (!token) {
      setError("Sign in again to disconnect Xero.");
      return;
    }
    const response = await fetch("/api/integrations/xero/disconnect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ connectionId: connectedConnectionId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to disconnect Xero.");
      return;
    }
    setConnectedIntegration(null);
    setConnectedConnectionId("");
    setConnectedOrganizationName("");
    setConnectedLastSync("");
    setSyncDiagnostics(null);
    setConnectionStatus("idle");
    setXeroEntities([]);
    setMessage("Xero disconnected.");
  };

  useEffect(() => {
    if (searchParams?.get("step") !== "connect-accounting" || searchParams?.get("provider") !== "xero" || hasResumedProviderConnect.current) return;
    hasResumedProviderConnect.current = true;
    selectIntegration("xero");
    setStep(connectQuickBooksStep);
    console.log("[onboarding/accounting-connect] resumed onboarding with Xero selected", {
      selectedProvider: "xero",
      step: "connect-accounting",
      loginRedirectTriggered: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (step !== generatePackageStep) return;
    if (firstReviewSyncTriggered.current) return;
    if (firstReviewSyncState === "loading" || firstReviewSyncState === "ready") return;
    firstReviewSyncTriggered.current = true;
    setFirstReviewSyncState("loading");
    (async () => {
      try {
        const ok = await syncConnectedIntegration();
        setFirstReviewSyncState(ok ? "ready" : "failed");
      } catch {
        setFirstReviewSyncState("failed");
      }
    })();
  }, [step]);

  const retryFirstReviewSync = () => {
    firstReviewSyncTriggered.current = true;
    setFirstReviewSyncState("loading");
    (async () => {
      try {
        const ok = await syncConnectedIntegration();
        setFirstReviewSyncState(ok ? "ready" : "failed");
      } catch {
        setFirstReviewSyncState("failed");
      }
    })();
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
        "Connect an accounting system before continuing, or choose Skip for Now and complete the manual company setup fields.",
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
            body { font-family: Arial, sans-serif; margin: 48px; color: #28251D; line-height: 1.6; }
            h1 { color: #111112; font-size: 34px; margin-bottom: 8px; }
            h2 { color: #111112; margin-top: 28px; }
            .brand { color: #C9A961; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
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

  const readActiveReportPayload = (): ActiveReportPayload | null => {
    return (() => {
      try {
        return JSON.parse(window.localStorage.getItem("advisacor_active_report_payload") || "null") as ActiveReportPayload | null;
      } catch {
        return null;
      }
    })();
  };

  const reportPayloadCounts = (reportPayload: ActiveReportPayload | null) => {
    const normalizedData = reportPayload?.reportDataContext?.normalizedData || reportPayload?.normalizedData;
    return {
      normalizedAccounts: normalizedData?.normalizedAccounts?.length || 0,
      normalizedTrialBalance: normalizedData?.normalizedTrialBalance?.length || 0,
      normalizedBalanceSheet: normalizedData?.normalizedBalanceSheet?.length || 0,
      normalizedIncomeStatement: normalizedData?.normalizedIncomeStatement?.length || 0,
    };
  };

  const reportPayloadSyncId = (reportPayload: ActiveReportPayload | null) => {
    return reportPayload?.reportDataContext?.syncId || reportPayload?.normalizedData?.syncId || reportPayload?.syncId || "";
  };

  const reportPayloadSourceSystem = (reportPayload: ActiveReportPayload | null) => {
    return reportPayload?.reportDataContext?.sourceSystem || reportPayload?.normalizedData?.sourceSystem || reportPayload?.sourceSystem || "";
  };

  const reportPayloadConnectionId = (reportPayload: ActiveReportPayload | null) => {
    return reportPayload?.reportDataContext?.connectionId || reportPayload?.normalizedData?.connectionId || reportPayload?.connectionId || "";
  };

  const reportPayloadTenantId = (reportPayload: ActiveReportPayload | null) => {
    return reportPayload?.reportDataContext?.tenantId || reportPayload?.normalizedData?.tenantId || reportPayload?.tenantId || null;
  };

  const reportPayloadTenantName = (reportPayload: ActiveReportPayload | null) => {
    return reportPayload?.reportDataContext?.tenantName || reportPayload?.normalizedData?.tenantName || reportPayload?.tenantName || "";
  };

  const reportPayloadPeriodLabel = (reportPayload: ActiveReportPayload | null) => {
    const reportPeriod = reportPayload?.reportDataContext?.reportPeriod || reportPayload?.normalizedData?.reportPeriod;
    const endDate = typeof reportPeriod === "object" && reportPeriod && "endDate" in reportPeriod ? String(reportPeriod.endDate || "") : "";
    if (!endDate) return undefined;
    const parsed = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return endDate;
    return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  };

  const isXeroPlaceholderPayload = (reportPayload: ActiveReportPayload | null) => {
    if (reportPayloadSourceSystem(reportPayload) !== "xero") return false;
    const counts = reportPayloadCounts(reportPayload);
    const syncId = reportPayloadSyncId(reportPayload);
    const connectionId = reportPayloadConnectionId(reportPayload);
    return (
      syncId.startsWith("lead-xero-") ||
      connectionId.startsWith("lead:xero:") ||
      (counts.normalizedAccounts === 0 &&
        counts.normalizedTrialBalance === 0 &&
        counts.normalizedBalanceSheet <= 3 &&
        counts.normalizedIncomeStatement <= 2)
    );
  };

  const buildPayloadFromLatestSync = (result: LatestNormalizedResponse, connectionId: string, sourceSystem: string): ActiveReportPayload => {
    return {
      sourceSystem: result.normalizedData?.sourceSystem || result.reportDataContext?.sourceSystem || sourceSystem,
      adapterName: result.normalizedData?.adapterName || result.reportDataContext?.adapterName || null,
      tenantId: result.tenantId || result.normalizedData?.tenantId || result.reportDataContext?.tenantId || null,
      tenantName: result.tenantName || result.normalizedData?.tenantName || connectedOrganizationName,
      lastSyncedAt: result.lastSyncedAt || result.normalizedData?.lastSyncedAt || new Date().toISOString(),
      connectionId,
      syncId: result.syncId || result.reportDataContext?.syncId || "",
      diagnostics: result.diagnostics || null,
      normalizedData: result.normalizedData || null,
      reportDataContext: result.reportDataContext || null,
      preflight: null,
    };
  };

  const buildReportDataContextFromSync = (latestSync: LatestNormalizedResponse, sourceSystem: IntegrationProviderId, connectionId = "") => {
    return buildPayloadFromLatestSync(latestSync, latestSync.connectionId || connectionId, sourceSystem);
  };

  const promoteSummarySyncToPackageContext = () => {
    if (!reportSummarySource?.payload || reportSummarySource.sourceSystem !== selectedIntegration) {
      setPackageLookupDebug((current) => ({
        ...current,
        latestSuccessfulSyncFound: false,
        syncLookupResult: "summary sync unavailable",
        mismatchReasons: ["source mismatch"],
      }));
      return null;
    }
    const payload = setPackageContextForProvider(selectedIntegration, reportSummarySource.payload);
    setPackageLookupDebug({
      syncIdSearched: reportSummarySource.syncId || null,
      connectionIdSearched: reportSummarySource.connectionId || null,
      sourceSystemSearched: reportSummarySource.sourceSystem || null,
      tenantIdSearched: reportSummarySource.tenantId || null,
      companyIdSearched: reportPayloadCompanyId(reportSummarySource.payload),
      reportPeriodSearched: reportPayloadReportPeriod(reportSummarySource.payload),
      latestSuccessfulSyncFound: Boolean(payload),
      syncLookupResult: payload ? "using summary sync" : "summary sync unavailable",
      latestSyncStatus: activeAccountingContext?.latestSyncStatus || payload?.normalizedData?.syncStatus || null,
      latestSyncId: activeAccountingContext?.latestSyncId || reportSummarySource.syncId || null,
      packageGeneratorExpectedStatus: activeAccountingContext?.packageGeneratorExpectedStatus || "SUCCESS",
      packageGeneratorFoundStatus: activeAccountingContext?.packageGeneratorFoundStatus || payload?.normalizedData?.syncStatus || null,
      mismatchReasons: payload ? [] : ["sync status mismatch"],
    });
    return payload;
  };

  const loadLatestNormalizedReportPayload = async (currentPayload: ActiveReportPayload | null): Promise<ActiveReportPayload | null> => {
    const sourceSystem = selectedIntegration;
    const activeContextPayload = await hydrateActiveAccountingContext(
      sourceSystem,
      connectedConnectionId || reportPayloadConnectionId(currentPayload),
      { forceRefresh: sourceSystem === "xero" },
    );
    const expectedConnectionId = connectedConnectionId || reportPayloadConnectionId(currentPayload);
    if (
      !activeContextPayload &&
      reportSummarySource?.payload &&
      reportSummarySource.sourceSystem === sourceSystem &&
      payloadMatchesSelectedConnection(sourceSystem, reportSummarySource.payload, expectedConnectionId)
    ) {
      console.info("Connected Reports Summary Source:", {
        syncId: reportSummarySource.syncId || null,
        connectionId: reportSummarySource.connectionId || null,
        sourceSystem: reportSummarySource.sourceSystem || null,
        tenantId: reportSummarySource.tenantId || null,
      });
      return promoteSummarySyncToPackageContext();
    }
    if (!activeContextPayload) {
      if (sourceSystem === "xero") {
        throw new Error("Unable to refresh Xero report context before PDF generation. Please reconnect or retry Xero sync.");
      }
      return null;
    }
    const latestSync = activeContextPayload as LatestNormalizedResponse;
    const nextPayload = buildReportDataContextFromSync(latestSync, sourceSystem, connectedConnectionId);
    const previousSyncId = reportPayloadSyncId(currentPayload);
    const latestSyncId = reportPayloadSyncId(nextPayload);
    console.info("Latest Successful Sync:", {
      syncId: latestSyncId,
      counts: reportPayloadCounts(nextPayload),
    });
    console.info("Package Context:", {
      syncId: previousSyncId,
      counts: reportPayloadCounts(currentPayload),
    });
    if (previousSyncId && latestSyncId && previousSyncId !== latestSyncId) {
      console.warn("Package context is stale.", {
        selectedProvider: sourceSystem,
        activeConnectionId: reportPayloadConnectionId(nextPayload),
        latestSuccessfulSyncId: latestSyncId,
        packageContextSyncId: previousSyncId,
      });
    }
    window.localStorage.setItem("advisacor_active_report_payload", JSON.stringify(nextPayload));
    setReportContextForProvider(sourceSystem, nextPayload);
    return nextPayload;
  };

  const logPackageGenerationInput = (reportPayload: ActiveReportPayload | null) => {
    const normalizedData = reportPayload?.reportDataContext?.normalizedData || reportPayload?.normalizedData;
    const summaryLog = {
      companyId: reportSummarySource?.payload?.reportDataContext?.companyId || reportSummarySource?.payload?.normalizedData?.companyId || null,
      sourceSystem: reportSummarySource?.sourceSystem || null,
      connectionId: reportSummarySource?.connectionId || null,
      tenantId: reportSummarySource?.tenantId || null,
      syncId: reportSummarySource?.syncId || null,
      foundReports: reportSummary.found.map((report) => report.id),
    };
    const packageLog = {
      companyId: reportPayload?.reportDataContext?.companyId || normalizedData?.companyId || null,
      sourceSystem: reportPayloadSourceSystem(reportPayload) || null,
      connectionId: reportPayloadConnectionId(reportPayload) || null,
      tenantId: reportPayloadTenantId(reportPayload),
      syncId: reportPayloadSyncId(reportPayload) || null,
      syncLookupResult: reportPayload ? "loaded" : "not_found",
    };
    console.info("Connected Reports Summary:", summaryLog);
    console.info("Generate First Package:", packageLog);
    console.info("Connected Reports Summary vs Generate First Package:", {
      connectedReportsSummary: summaryLog,
      generateFirstPackage: packageLog,
    });
    console.info("Package Generation Input:", {
      sourceSystem: reportPayload?.reportDataContext?.sourceSystem || normalizedData?.sourceSystem || reportPayload?.sourceSystem,
      connectionId: reportPayload?.reportDataContext?.connectionId || normalizedData?.connectionId || reportPayload?.connectionId,
      tenantName: reportPayload?.reportDataContext?.tenantName || normalizedData?.tenantName || reportPayload?.tenantName,
      syncId: reportPayload?.reportDataContext?.syncId || normalizedData?.syncId || reportPayload?.syncId,
      ...reportPayloadCounts(reportPayload),
    });
    console.info("Selected Provider:", selectedIntegration);
    console.info("Active Connection ID:", connectedConnectionId || reportPayloadConnectionId(reportPayload));
    console.info("Active Tenant ID:", reportPayloadTenantId(reportPayload));
    console.info("Latest Successful Sync ID:", reportPayloadSyncId(reportPayload));
    console.info("Package Context Sync ID:", reportPayloadSyncId(reportPayload));
    console.info("Latest Sync Counts:", reportPayloadCounts(reportPayload));
    console.info("Package Context Counts:", reportPayloadCounts(reportPayload));
    console.info("Source System:", reportPayloadSourceSystem(reportPayload));
    console.info("Report Period:", reportPayload?.reportDataContext?.reportPeriod || reportPayload?.normalizedData?.reportPeriod || null);
    console.info("Active Report Context:", {
      sourceSystem: reportPayloadSourceSystem(reportPayload),
      connectionId: reportPayloadConnectionId(reportPayload),
      tenantId: reportPayloadTenantId(reportPayload),
      tenantName: reportPayloadTenantName(reportPayload),
      syncId: reportPayloadSyncId(reportPayload),
      reportPeriod: reportPayload?.reportDataContext?.reportPeriod || reportPayload?.normalizedData?.reportPeriod || null,
      ...reportPayloadCounts(reportPayload),
    });
  };

  const refreshActiveReportContext = async () => {
    setError("");
    setMessage("");
    const currentPayload = readActiveReportPayload();
    const nextPayload = await loadLatestNormalizedReportPayload(currentPayload);
    logPackageGenerationInput(nextPayload);
    if (!nextPayload || !reportPayloadSyncId(nextPayload)) {
      setError("No latest successful sync found for the selected accounting connection.");
      return;
    }
    setMessage("Active report context refreshed from the latest successful sync.");
  };

  const downloadTrialReport = async () => {
    const latestPayload = await loadLatestNormalizedReportPayload(readActiveReportPayload());
    const summaryPayload =
      !latestPayload &&
      reportSummarySource?.sourceSystem === selectedIntegration &&
      reportSummarySource.payload &&
      payloadMatchesSelectedConnection(selectedIntegration, reportSummarySource.payload)
        ? promoteSummarySyncToPackageContext()
        : null;
    const reportPayload = latestPayload || summaryPayload;
    if (reportPayload) setPackageContextForProvider(selectedIntegration, reportPayload);
    logPackageGenerationInput(reportPayload);
    const activeProvider = selectedIntegration;
    if (!reportPayload?.normalizedData && !reportPayload?.reportDataContext?.normalizedData) {
      throw new Error("No successful accounting sync found. Please sync first.");
    }
    if (activeProvider === "xero" && isXeroPlaceholderPayload(reportPayload)) {
      throw new Error("Xero report context is still empty. Please resync Xero or refresh report context before generating.");
    }
    if (reportPayloadSourceSystem(reportPayload) !== activeProvider) {
      throw new Error(`Provider mismatch: active ${activeProvider} but normalized data is ${reportPayloadSourceSystem(reportPayload) || "missing"}`);
    }
    if (reportPayload?.reportDataContext) {
      const reportContext = reportPayload.reportDataContext as ReportDataContext;
      assertReportPreflight(reportContext, {
        requiresLiveData: true,
        schedules: [
          {
            name: "Onboarding first review",
            sourceSystem: reportContext.sourceSystem,
            connectionId: reportContext.connectionId,
            syncId: reportContext.syncId,
            reportPeriod: reportContext.reportPeriod,
          },
        ],
      });
    }
    downloadFinancialPackagePdf({
      companyName: company.name || "QuickBooks Company",
      industryType: company.industry_type || "Industry Intelligence",
      preparedBy: "Advisacor",
      reportPeriod: reportPayloadPeriodLabel(reportPayload),
      trial: true,
      normalizedData: (reportPayload?.normalizedData || undefined) as ReportDataContext["normalizedData"] | undefined,
      reportDataContext: (reportPayload?.reportDataContext || undefined) as ReportDataContext | undefined,
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
        if (!leadId && !isPaidUser) {
          router.push("/free-review?source=generate-review-gate");
          return;
        }
        if (isPaidUser) {
          setError("Your session expired. Please sign in again to continue.");
          router.push(`/signin?next=${encodeURIComponent("/onboarding")}`);
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
          accountingProvider: connectedIntegration || selectedIntegration,
          quickBooksConnected: connectionStatus === "connected" && (connectedIntegration || selectedIntegration) === "quickbooks",
          xeroConnected: connectionStatus === "connected" && (connectedIntegration || selectedIntegration) === "xero",
          generatedAt: new Date().toISOString(),
          onboardingComplete: true,
        };
        window.localStorage.setItem("advisacor_lead_dashboard_session", JSON.stringify(leadDashboardSession));
        window.localStorage.setItem("advisacor_onboarding_complete", "true");
        window.localStorage.setItem("advisacor_first_package_status", "generated");
        setFirstPackageSession(leadDashboardSession);
        setFirstPackageReady(true);
        await downloadTrialReport();
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
      await downloadTrialReport();
      setMessage("Your first Advisacor financial review is ready. Downloading your PDF package and opening your company dashboard...");
      window.setTimeout(advanceToDashboard, 900);
    } catch (error) {
      setError(preflightIssueText(error));
    } finally {
      setIsSaving(false);
    }
  };

  // Phase TCP1 W2.5 Block 9j — paid users see PaidUserWelcome unless a step is set.
  // Phase TCP1 W3 — qbError must force the onboarding shell so the banner is visible.
  const isWelcomeMode =
    !searchParams?.get("step") &&
    !searchParams?.get("quickBooksConnected") &&
    !qbErrorCode;
  if (contextLoading || (checkoutSuccessPending && !isPaidUser && isWelcomeMode)) {
    return (
      <main className="min-h-screen bg-[#111112] px-6 py-24 text-center text-[#7A7974]">
        {checkoutSuccessPending ? "Confirming your subscription…" : "Loading…"}
      </main>
    );
  }
  if (isPaidUser && isWelcomeMode) {
    return (
      <PaidUserWelcome
        tierKey={paidTierKey ?? "review_assist"}
        email={onboardingContext?.email ?? ""}
        businessName={company.name || undefined}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      {qbErrorCode ? (
        <div className="mx-auto max-w-6xl px-6 pt-[120px] md:pt-[140px]">
          {(() => {
            const copy = qbErrorCopy(qbErrorCode);
            return (
              <div
                role="alert"
                className="rounded-2xl border border-[#B84A3E]/50 bg-[#B84A3E]/10 p-5 text-[#ECEBE7]"
              >
                <p className={`text-sm font-semibold uppercase tracking-[0.22em] text-[#E89890] ${headingFont}`}>
                  QuickBooks connection issue
                </p>
                <p className={`mt-2 text-lg font-semibold text-white ${headingFont}`}>{copy.title}</p>
                <p className="mt-2 leading-6 text-[#A29E93]">{copy.body}</p>
                <div className="mt-4">
                  <a
                    href={copy.actionHref}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm ${primaryCtaClass} ${focusRing()}`}
                  >
                    {copy.actionLabel}
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}
      <div className={`mx-auto max-w-6xl px-6 pb-16 ${qbErrorCode ? "pt-6" : "pt-[120px] md:pt-[140px]"}`}>
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
          {isSuperAdmin && (
            <div className="rounded-full border border-[#B84A3E]/40 bg-[#B84A3E]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#E89890]">
              Super Admin Journey Test
            </div>
          )}
          <SupportHelpButton onClick={() => setSupportOpen(true)} compact />
        </header>

        <section className="mt-2 rounded-[2rem] border border-[#C9A961]/20 bg-[#111112]/85 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.22em] text-[#C9A961] ${headingFont}`}>
                {isPaidUser ? "Paid Onboarding" : "Company Account Onboarding"}
              </p>
              <h1 className={`mt-3 text-4xl font-semibold tracking-[-0.03em] md:text-5xl ${headingFont}`}>
                {isPaidUser
                  ? "Connect your first client and get findings in under 15 minutes."
                  : "Reach your first executive package in under 15 minutes."}
              </h1>
              <p className="mt-3 max-w-3xl leading-7 text-[#A29E93]">
                {isPaidUser
                  ? "Connect QuickBooks for the fastest path, or upload financial statements if your client is not on QuickBooks."
                  : "Choose the fastest path to value: upload financial statements for a limited free report or connect accounting for the full Advisacor intelligence platform."}
              </p>
            </div>
            <div className="rounded-3xl border border-[#C9A961]/30 bg-[#C9A961]/10 p-5 text-left lg:w-80">
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A961] ${headingFont}`}>Time To First Value</p>
              <p className={`mt-2 text-2xl font-semibold text-[#ECEBE7] ${headingFont}`}>{formatEstimatedRemaining(estimatedRemainingSeconds)}</p>
              <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                Target: meaningful output in {onboardingDesignPrinciple.targetMinutes} minutes or less.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Guided setup progress</p>
              <p className="mt-1 text-sm leading-6 text-[#7A7974]">
                Step {step + 1} of {steps.length}: {steps[step]} should take about {Math.max(1, Math.ceil(currentStepSeconds / 60))} minute{Math.ceil(currentStepSeconds / 60) === 1 ? "" : "s"}.
              </p>
            </div>
            <p className="text-sm font-semibold text-[#C9A961]">{progressPercent}% complete</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#111112]/60">
            <div className="h-full rounded-full bg-[#C9A961]" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-4 rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-4 py-3 text-sm leading-6 text-[#A29E93]">
            We only ask for what helps you reach a useful first package faster. Anything that can wait should be automated, simplified, or postponed.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9A961]/20 bg-[#C9A961]/10 px-4 py-3">
            <p className="text-sm font-bold text-[#C9A961]">Need Help? Ask an onboarding question or submit a support ticket without leaving setup.</p>
            <SupportHelpButton onClick={() => setSupportOpen(true)} compact />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.32fr_1fr]">
          <aside className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-5">
            <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Onboarding Progress</p>
            <div className="mt-4 grid gap-2">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={focusRing(`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    step === index ? "bg-[#C9A961] text-[#111112]" : isStepComplete(index) ? "bg-[#C9A961]/15 text-[#C9A961]" : "bg-[#111112]/60 text-[#7A7974] hover:bg-[#111112]/60"
                  }`)}
                >
                  <span className="block text-[10px] uppercase tracking-[0.18em] opacity-75">Step {index + 1}</span>
                  <span className={`mt-1 block ${headingFont}`}>{label}{isStepComplete(index) && step !== index ? " ✓" : ""}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-6">
            {step === companyInfoStep && (
              <div className="grid gap-5">
                <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                  <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Customer Type Selection</p>
                  <p className="mt-2 text-sm leading-6 text-[#A29E93]">
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
                <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                  <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Select Industry</p>
                  <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                    Industry type drives KPI recommendations, dashboard emphasis, benchmarking, and Pulse commentary.
                  </p>
                </div>
                <Select label="Industry type" value={company.industry_type} options={industryTypeOptions} help={contextualHelp.industryType} onChange={(value) => updateCompany("industry_type", value)} />
                {recommendedPackage && (
                  <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                    <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Recommended Based On Your Available Data</p>
                    <p className="mt-2 text-sm leading-6 text-[#A29E93]">
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
                <div className="flex items-center gap-2 text-sm font-semibold text-[#A29E93]">
                  Connect Accounting System
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
                        selectIntegration("quickbooks");
                      }
                    }}
                    className={focusRing(`rounded-3xl border p-5 text-left transition ${
                      dataSourcePath === "connected" ? "border-[#C9A961]/70 bg-[#C9A961]/15" : "border-[#C9A961]/20 bg-[#111112]/85 hover:border-[#C9A961]/50"
                    }`)}
                  >
                    <p className="text-lg font-semibold text-[#ECEBE7]">Connect Accounting</p>
                    <p className="mt-2 text-sm leading-6 text-[#7A7974]">
                      Connect QuickBooks or Xero to unlock the full Advisacor intelligence platform.
                    </p>
                    <ul className="mt-4 grid gap-2 text-sm text-[#A29E93]">
                      {["Full report", "Full intelligence engine", "Automated updates", "Weekly Executive Briefs", "Monthly Packages", "AI access", "Forecasting", "Budgeting", "Industry intelligence"].map((benefit) => (
                        <li key={benefit}>- {benefit}</li>
                      ))}
                    </ul>
                  </button>
                  <button
                    type="button"
                    onClick={chooseManualUploadPath}
                    className={focusRing(`rounded-3xl border p-5 text-left transition ${
                      dataSourcePath === "manual_upload" ? "border-[#C9A961]/40 bg-[#C9A961]/10" : "border-[#C9A961]/20 bg-[#111112]/85 hover:border-[#C9A961]/50"
                    }`)}
                  >
                    <p className="text-lg font-semibold text-[#ECEBE7]">Skip for Now / Upload Reports Instead</p>
                    <p className="mt-2 text-sm leading-6 text-[#7A7974]">
                      Skip connected accounting and provide company information manually.
                    </p>
                    <p className="mt-4 rounded-2xl border border-[#C9A961]/25 bg-[#C9A961]/10 px-4 py-3 text-sm font-bold text-[#C9A961]">
                      Manual setup fields will appear below.
                    </p>
                  </button>
                </div>

                {dataSourcePath === "connected" ? (
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-5">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Available Accounting Integrations</p>
                      <HelpTip content={contextualHelp.accountingSystem} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#7A7974]">
                      Advisacor normalizes connected accounting data before dashboard, Pulse, PDF, PowerPoint, KPI, flux, and scheduled reporting engines use it.
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {accountingIntegrationOptions.map((integration) => (
                        <button
                          key={integration.id}
                          type="button"
                          onClick={() => integration.status === "available" && selectIntegration(integration.id)}
                          disabled={integration.status !== "available"}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selectedIntegration === integration.id
                              ? "border-[#C9A961]/70 bg-[#C9A961]/15"
                              : "border-[#C9A961]/20 bg-[#111112]/70 hover:border-[#C9A961]/50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#ECEBE7]">{integration.label}</p>
                            {integration.status === "coming_soon" && (
                              <span className="rounded-full bg-[#111112]/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A7974]">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#7A7974]">{integration.description}</p>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <a
                        href={getSelectedConnectUrl(selectedIntegration)}
                        onClick={(event) => {
                          event.preventDefault();
                          void validateAccountingConnection(selectedIntegration);
                        }}
                        aria-disabled={connectionStatus === "connecting" || getSelectedIntegrationOption().status !== "available"}
                        className={focusRing(`rounded-2xl bg-[#C9A961] px-5 py-3 text-sm font-semibold text-[#111112] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A] ${
                          connectionStatus === "connecting" || getSelectedIntegrationOption().status !== "available"
                            ? "pointer-events-none cursor-not-allowed opacity-60"
                            : ""
                        }`)}
                      >
                        {connectionStatus === "connecting"
                          ? "Connecting..."
                          : connectionStatus === "connected" && connectedIntegration === selectedIntegration
                            ? `${getSelectedIntegrationOption().label} Connected`
                            : `Connect ${getSelectedIntegrationOption().label}`}
                      </a>
                      <button type="button" onClick={() => setConnectionValidationOpen(true)} disabled={connectionStatus !== "connected"} className={focusRing("rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-semibold text-[#A29E93] disabled:cursor-not-allowed disabled:opacity-40")}>
                        View Validation Summary
                      </button>
                    </div>
                    <p className="mt-3 rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 px-4 py-3 text-xs font-bold text-[#A29E93]">
                      selectedProvider: {selectedIntegration} | connectUrl: {getSelectedConnectUrl(selectedIntegration)} | session: {String(hasOnboardingSession)}
                    </p>
                    {selectedIntegration === "xero" && (
                      <a
                        href="/api/integrations/xero/connect"
                        onClick={(event) => {
                          event.preventDefault();
                          void refreshAccountingConnectSessionCookie().then((token) => {
                            console.log("[onboarding/accounting-connect] TEST DIRECT XERO CONNECT clicked", {
                              selectedProvider: selectedIntegration,
                              connectUrl: "/api/integrations/xero/connect",
                              session: Boolean(token),
                            });
                            window.location.href = "/api/integrations/xero/connect";
                          });
                        }}
                        className="mt-3 block rounded-2xl border border-[#C9A961]/25 bg-[#111112]/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#A29E93]"
                      >
                        TEST DIRECT XERO CONNECT
                      </a>
                    )}
                    {connectionStatus !== "connected" && (
                      <p className="mt-4 rounded-2xl border border-[#C9A961]/25 bg-[#C9A961]/10 px-4 py-3 text-sm font-bold text-[#C9A961]">
                        Connect QuickBooks or Xero to auto-populate company details, or choose Skip for Now to enter them manually.
                      </p>
                    )}
                    {connectedIntegration === "xero" && (
                      <div className="mt-5 rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                        <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Xero Integration Status</p>
                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">Status</p>
                            <p className="mt-1 font-semibold text-[#ECEBE7]">{connectionStatus === "connected" ? "Connected" : "Pending organization selection"}</p>
                          </div>
                          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">Organization Name</p>
                            <p className="mt-1 font-semibold text-[#ECEBE7]">{connectedOrganizationName || "Select a Xero organization"}</p>
                          </div>
                          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">Last Sync</p>
                            <p className="mt-1 font-semibold text-[#ECEBE7]">{connectedLastSync ? new Date(connectedLastSync).toLocaleString() : "Not synced yet"}</p>
                          </div>
                          <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">Source System</p>
                            <p className="mt-1 font-semibold text-[#ECEBE7]">{syncDiagnostics?.sourceSystem || "xero"}</p>
                          </div>
                        </div>
                        {syncDiagnostics && (
                          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                            {[
                              ["Source System", syncDiagnostics.sourceSystem],
                              ["Tenant Name", syncDiagnostics.tenantName || connectedOrganizationName || "Xero Organization"],
                              ["Accounts Count", syncDiagnostics.accountsCount],
                              ["Trial Balance Count", syncDiagnostics.trialBalanceCount],
                              ["Balance Sheet Count", syncDiagnostics.balanceSheetCount],
                              ["Income Statement Count", syncDiagnostics.incomeStatementCount],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">{label}</p>
                                <p className="mt-1 font-semibold text-[#ECEBE7]">{value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {syncDiagnostics && isStaffViewer && (
                          <div className="mt-4 rounded-3xl border border-[#C9A961]/20 bg-[#111112]/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A29E93]">Temporary Xero Fetch Debug</p>
                            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                              {[
                                ["Raw Xero Accounts Count", syncDiagnostics.xeroRawAccountsCount ?? "Not captured"],
                                ["Mapped Accounts Count", syncDiagnostics.xeroMappedAccountsCount ?? syncDiagnostics.accountsCount],
                                ["Raw Trial Balance Flattened Rows", syncDiagnostics.xeroRawTrialBalanceFlattenedRowsCount ?? "Not captured"],
                                ["Mapped Trial Balance Rows", syncDiagnostics.xeroMappedTrialBalanceRowsCount ?? syncDiagnostics.trialBalanceCount],
                                ["Raw Balance Sheet Flattened Rows", syncDiagnostics.xeroRawBalanceSheetFlattenedRowsCount ?? "Not captured"],
                                ["Mapped Balance Sheet Rows", syncDiagnostics.xeroMappedBalanceSheetRowsCount ?? syncDiagnostics.balanceSheetCount],
                                ["Raw P&L Flattened Rows", syncDiagnostics.xeroRawProfitAndLossFlattenedRowsCount ?? "Not captured"],
                                ["Mapped P&L Rows", syncDiagnostics.xeroMappedIncomeStatementRowsCount ?? syncDiagnostics.incomeStatementCount],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">{label}</p>
                                  <p className="mt-1 font-semibold text-[#ECEBE7]">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {xeroEntities.length > 0 && (
                          <div className="mt-4 grid gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C9A961]">Select Xero Organization</p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {xeroEntities.map((entity) => (
                                <button
                                  key={entity.canonicalId || entity.externalId}
                                  type="button"
                                  onClick={() => void selectXeroEntity(entity)}
                                  className="rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-left text-sm font-semibold text-[#ECEBE7] transition hover:border-[#C9A961]/60"
                                >
                                  {entity.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void loadXeroEntities()}
                            disabled={(!connectedConnectionId && !freeReviewLeadId) || isLoadingXeroEntities}
                            className={focusRing("rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-semibold text-[#ECEBE7] disabled:cursor-not-allowed disabled:opacity-50")}
                          >
                            {isLoadingXeroEntities ? "Loading Organizations..." : "Load Organizations"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void syncConnectedIntegration()}
                            disabled={!connectedConnectionId || isSyncingIntegration}
                            className={focusRing("rounded-2xl bg-[#C9A961] px-5 py-3 text-sm font-semibold text-[#111112] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A] disabled:cursor-not-allowed disabled:opacity-50")}
                          >
                            {isSyncingIntegration ? "Syncing..." : "Sync Now"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void disconnectConnectedIntegration()}
                            disabled={!connectedConnectionId}
                            className={focusRing("rounded-2xl border border-[#B84A3E]/30 px-5 py-3 text-sm font-semibold text-[#E89890] disabled:cursor-not-allowed disabled:opacity-50")}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    )}
                    {connectionStatus === "connected" && !manualCompanySetupVisible && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                          <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>{getSelectedIntegrationOption().label} company profile imported</p>
                          <p className="mt-2 text-sm leading-6 text-[#A29E93]">
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
                              <div key={label} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">{label}</dt>
                                <dd className="mt-1 font-semibold text-[#ECEBE7]">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
                      </div>
                    )}
                    {connectionStatus === "connected" && manualCompanySetupVisible && (
                      <div className="grid gap-4">
                        <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                          <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>We found partial company information.</p>
                          <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                            Advisacor imported what your accounting system provided. Confirm or complete the missing fields below.
                          </p>
                          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                            {[
                              ["Company Name", company.name || `${getSelectedIntegrationOption().label} Company`],
                              ["Industry", company.industry_type || "Professional Services"],
                              ["Revenue", company.revenue_range || "$1M-$5M"],
                              ["Fiscal Year", company.fiscal_year || "Calendar Year"],
                              ["Employee Count", company.employee_count || "Imported if available"],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-3">
                                <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A7974]">{label}</dt>
                                <dd className="mt-1 font-semibold text-[#ECEBE7]">{value}</dd>
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
                  <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                    <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Manual setup selected</p>
                    <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                      Complete the company information below. Financial report uploads remain in Step 3.
                    </p>
                  </div>
                )}
                {manualCompanySetupVisible && (
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-5">
                    <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Manual Company Setup</p>
                    <p className="mt-2 text-sm leading-6 text-[#7A7974]">
                      We only ask for these fields because connected accounting was skipped or you chose to edit imported company details.
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
                  <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                    <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Reports discovered from connected accounting</p>
                    <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                      No manual uploads are required. Advisacor will use the reports discovered during the accounting connection.
                    </p>
                    <div className="mt-5">
                      <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-5">
                    <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Upload Financial Reports</p>
                    <p className="mt-2 text-sm leading-6 text-[#7A7974]">
                      {dataSourcePath === "connected"
                        ? "Connected accounting did not provide every required financial report. Upload Balance Sheet and Income Statement to complete the first review."
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
                      <button type="button" onClick={openReportGuide} className={focusRing("rounded-2xl border border-[#C9A961]/30 bg-[#C9A961]/10 px-5 py-3 text-sm font-semibold text-[#C9A961]")}>
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
                <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                  <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Configure Pulse</p>
                  <p className="mt-2 text-sm leading-6 text-[#A29E93]">
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
                  <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-6">
                    <p className={`text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A961] ${headingFont}`}>Report Ready</p>
                    <h2 className={`mt-3 text-3xl font-semibold text-[#ECEBE7] ${headingFont}`}>Your first Advisacor financial review is ready.</h2>
                    <p className="mt-3 text-sm leading-6 text-[#A29E93]">
                      Pulse has identified 3 opportunities and 2 risks in your business.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void downloadTrialReport()} className={focusRing("rounded-2xl bg-[#C9A961] px-5 py-3 text-sm font-semibold text-[#111112] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A]")}>
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
                        className={focusRing("rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-semibold text-[#A29E93]")}
                      >
                        View Dashboard
                      </button>
                    </div>
                  </div>
                )}
                {isStaffViewer && (
                  <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112]/70 p-5 text-xs font-bold text-[#ECEBE7]/90">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A29E93]">Sync Lookup Debug</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85/70 p-4">
                        <p>ACTIVE PROVIDER: {selectedIntegration || "Not available"}</p>
                        <p>ACTIVE CONNECTION ID: {activeAccountingContext?.connectionId || connectedConnectionId || packageContextSource?.connectionId || reportSummarySource?.connectionId || "Not available"}</p>
                        <p>ACTIVE TENANT ID: {activeAccountingContext?.tenantId || packageContextSource?.tenantId || reportSummarySource?.tenantId || "Not available"}</p>
                        <p>ACTIVE COMPANY ID: {activeAccountingContext?.companyId || reportPayloadCompanyId(packageContextSource?.payload || reportSummarySource?.payload || null) || "Not available"}</p>
                        <p>Latest Sync Status: {packageLookupDebug.latestSyncStatus || activeAccountingContext?.latestSyncStatus || "Not available"}</p>
                        <p>Latest Sync ID: {packageLookupDebug.latestSyncId || activeAccountingContext?.latestSyncId || activeAccountingContext?.latestSuccessfulSyncId || "Not available"}</p>
                      </div>
                      <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85/70 p-4">
                        <p>CONNECTED REPORTS SUMMARY SOURCE</p>
                        <p>syncId: {reportSummarySource?.syncId || activeAccountingContext?.latestSuccessfulSyncId || "Not available"}</p>
                        <p>connectionId: {reportSummarySource?.connectionId || activeAccountingContext?.connectionId || "Not available"}</p>
                        <p>sourceSystem: {reportSummarySource?.sourceSystem || activeAccountingContext?.sourceSystem || "Not available"}</p>
                        <p>tenantId: {reportSummarySource?.tenantId || activeAccountingContext?.tenantId || "Not available"}</p>
                      </div>
                      <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85/70 p-4">
                        <p>PACKAGE GENERATOR LOOKUP</p>
                        <p>syncId searched: {packageLookupDebug.syncIdSearched || activeAccountingContext?.latestSuccessfulSyncId || "Not available"}</p>
                        <p>connectionId searched: {packageLookupDebug.connectionIdSearched || activeAccountingContext?.connectionId || "Not available"}</p>
                        <p>sourceSystem searched: {packageLookupDebug.sourceSystemSearched || activeAccountingContext?.sourceSystem || "Not available"}</p>
                        <p>tenantId searched: {packageLookupDebug.tenantIdSearched || activeAccountingContext?.tenantId || "Not available"}</p>
                        <p>Package Generator Expected Status: {packageLookupDebug.packageGeneratorExpectedStatus || activeAccountingContext?.packageGeneratorExpectedStatus || "SUCCESS"}</p>
                        <p>Package Generator Found Status: {packageLookupDebug.packageGeneratorFoundStatus || activeAccountingContext?.packageGeneratorFoundStatus || "Not available"}</p>
                      </div>
                      <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85/70 p-4">
                        <p>LATEST SUCCESSFUL SYNC FOUND?: {String(packageLookupDebug.latestSuccessfulSyncFound)}</p>
                        {!packageLookupDebug.latestSuccessfulSyncFound && (
                          <div className="mt-2">
                            <p>Reason:</p>
                            <ul className="mt-1 list-disc pl-5">
                              {(packageLookupDebug.mismatchReasons.length ? packageLookupDebug.mismatchReasons : ["sync status mismatch"]).map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="mt-2">Summary Sync ID: {reportSummarySource?.syncId || activeAccountingContext?.latestSuccessfulSyncId || "Not available"}</p>
                        <p>Package Sync ID: {packageContextSource?.syncId || activeAccountingContext?.latestSuccessfulSyncId || "Not available"}</p>
                        <p>Match: {String(Boolean((reportSummarySource?.syncId || activeAccountingContext?.latestSuccessfulSyncId) && (packageContextSource?.syncId || activeAccountingContext?.latestSuccessfulSyncId) && (reportSummarySource?.syncId || activeAccountingContext?.latestSuccessfulSyncId) === (packageContextSource?.syncId || activeAccountingContext?.latestSuccessfulSyncId)))}</p>
                      </div>
                      <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85/70 p-4">
                        <p>Persisted Sync Record:</p>
                        <p>syncId: {activeAccountingContext?.persistedSyncRecord?.syncId || "Not available"}</p>
                        <p>syncStatus: {activeAccountingContext?.persistedSyncRecord?.syncStatus || "Not available"}</p>
                        <p>companyId: {activeAccountingContext?.persistedSyncRecord?.companyId || "Not available"}</p>
                        <p>connectionId: {activeAccountingContext?.persistedSyncRecord?.connectionId || "Not available"}</p>
                        <p>tenantId: {activeAccountingContext?.persistedSyncRecord?.tenantId || "Not available"}</p>
                      </div>
                    </div>
                    <button type="button" onClick={promoteSummarySyncToPackageContext} className={focusRing("mt-4 rounded-2xl border border-[#C9A961]/30 px-4 py-2 text-xs font-semibold text-[#ECEBE7]/90")}>
                      Use Summary Sync
                    </button>
                  </div>
                )}
                <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                  <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Generate First Package</p>
                  <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                    Advisacor will now generate your executive summary, dashboard, and initial package, then take you directly to your company dashboard.
                  </p>
                  {dataSourcePath === "manual_upload" && (
                    <p className="mt-4 rounded-2xl border border-[#C9A961]/25 bg-[#C9A961]/10 px-4 py-3 text-sm font-bold text-[#C9A961]">
                      Limited report generated from uploaded financial statements.
                    </p>
                  )}
                  {dataSourcePath === "connected" && (
                    <p className="mt-4 rounded-2xl border border-[#C9A961]/25 bg-[#C9A961]/10 px-4 py-3 text-sm font-bold text-[#C9A961]">
                      Full one-time free package: Executive Summary, Full PDF, Sample PowerPoint, Industry Intelligence, AI Commentary, Health Score, Risks, and Opportunities.
                    </p>
                  )}
                </div>
                <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} manual={dataSourcePath === "manual_upload"} />
                <ul className="mt-4 space-y-2">
                  {firstReviewMilestones.map((label) => {
                    const isReadyRow = label === "Ready";
                    const state =
                      firstReviewSyncState === "failed"
                        ? "failed"
                        : firstReviewSyncState === "ready"
                          ? "ready"
                          : isReadyRow
                            ? "idle"
                            : "loading";
                    return (
                      <li key={label} className="flex items-center gap-3 text-sm text-[#ECEBE7]">
                        <span
                          className={
                            state === "ready"
                              ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A961] text-[#111112]"
                              : state === "failed"
                                ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/30 text-red-200"
                                : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/30 text-white/50"
                          }
                          aria-hidden="true"
                        >
                          {state === "ready" ? "✓" : state === "failed" ? "!" : "•"}
                        </span>
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                {firstReviewSyncState === "failed" && (
                  <button
                    type="button"
                    onClick={retryFirstReviewSync}
                    className={focusRing("mt-4 rounded-md border border-[#C9A961] px-4 py-2 text-sm font-semibold text-[#C9A961]")}
                  >
                    Retry
                  </button>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void refreshActiveReportContext()}
                    disabled={isSaving || !connectedConnectionId}
                    className={focusRing("rounded-2xl border border-[#C9A961]/25 px-5 py-3 text-sm font-semibold text-[#A29E93] disabled:cursor-not-allowed disabled:opacity-50")}
                  >
                    Refresh Context
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    disabled={firstReviewSyncState === "loading"}
                    className={focusRing(`${primaryCtaClass} rounded-md px-5 py-2 disabled:cursor-not-allowed disabled:opacity-60`)}
                  >
                    Proceed to Company Dashboard
                  </button>
                </div>
              </div>
            )}

            {step === dashboardStep && (
              <div className="grid gap-5">
                <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
                  <p className={`text-sm font-semibold text-[#C9A961] ${headingFont}`}>Dashboard</p>
                  <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                    The final onboarding outcome is the customer dashboard. Generate the first review to complete setup and enter the dashboard with your first package context.
                  </p>
                </div>
                <Link href="/dashboard" className={focusRing("inline-flex rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-semibold text-[#A29E93]")}>
                  Go to Dashboard
                </Link>
              </div>
            )}

            {error && <p className="mt-5 rounded-2xl border border-[#B84A3E]/30 bg-[#B84A3E]/10 p-4 text-sm font-bold text-[#E89890]">{error}</p>}
            {message && <p className="mt-5 rounded-2xl border border-[#437A22]/30 bg-[#437A22]/10 p-4 text-sm font-medium text-[#8CB56C]">{message}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={step === 0}
                className={focusRing("rounded-2xl border border-[#C9A961]/20 px-5 py-3 text-sm font-semibold text-[#A29E93] disabled:cursor-not-allowed disabled:opacity-40")}
              >
                Back
              </button>
              {step < generatePackageStep ? (
                <button type="button" onClick={continueOnboarding} className={focusRing(`rounded-2xl px-5 py-3 text-sm ${primaryCtaClass}`)}>
                  Continue
                </button>
              ) : (
                <span className="text-sm font-bold text-[#7A7974]">You're all set — head to your dashboard to start.</span>
              )}
            </div>
          </section>
        </section>
      </div>
      {supportOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A961] ${headingFont}`}>Need Help?</p>
                <h2 className={`mt-2 text-2xl font-semibold ${headingFont}`}>Onboarding Support</h2>
              </div>
              <button type="button" onClick={() => setSupportOpen(false)} className={focusRing("rounded-2xl border border-[#C9A961]/20 px-3 py-2 text-sm font-semibold text-[#A29E93]")}>
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
          <section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-[#C9A961]/20 bg-[#111112]/85 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A961] ${headingFont}`}>Connection Validation</p>
                <h2 className={`mt-2 text-2xl font-semibold ${headingFont}`}>Connected Reports Summary</h2>
                <p className="mt-2 text-sm leading-6 text-[#7A7974]">
                  Advisacor discovered available reports, evaluated the data, and selected the recommended package.
                </p>
              </div>
              <button type="button" onClick={() => setConnectionValidationOpen(false)} className={focusRing("rounded-2xl border border-[#C9A961]/20 px-3 py-2 text-sm font-semibold text-[#A29E93]")}>
                Close
              </button>
            </div>
            <div className="mt-5">
              <ConnectedReportsSummary reportSummary={reportSummary} recommendedPackage={recommendedPackage} />
            </div>
            <button type="button" onClick={continueAfterConnectionValidation} className={focusRing("mt-5 rounded-2xl bg-[#C9A961] px-5 py-3 text-sm font-semibold text-[#111112] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A]")}>
              Continue With Recommended Package
            </button>
          </section>
        </div>
      )}
      <SiteFooter />
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
    <label className="grid gap-2 text-sm font-bold text-[#A29E93]">
      <span className="flex items-center gap-2">
        {label}
        <HelpTip content={help} />
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85 px-4 py-3 text-[#ECEBE7] outline-none ring-[#C9A961]/50 focus:ring-2"
      />
    </label>
  );
}

function Select({ label, value, options, optionLabels = {}, onChange, help }: { label: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string) => void; help?: HelpContent }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#A29E93]">
      <span className="flex items-center gap-2">
        {label}
        <HelpTip content={help} />
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85 px-4 py-3 text-[#ECEBE7] outline-none ring-[#C9A961]/50 focus:ring-2"
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
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85 p-4 text-sm font-semibold text-[#ECEBE7]">
      <span className="flex items-center gap-2">
        {label}
        <HelpTip content={help} />
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#C9A961]" />
    </label>
  );
}

function ConnectedReportsSummary({ reportSummary, recommendedPackage, manual = false }: { reportSummary: ReportSummary; recommendedPackage: string; manual?: boolean }) {
  const packageLabel = companyPackageOptions.find((option) => option.id === recommendedPackage)?.label || recommendedPackage;
  return (
    <div className="mt-5 rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`text-sm font-semibold text-[#ECEBE7] ${headingFont}`}>Connected Reports Summary</p>
          <p className="mt-2 text-sm leading-6 text-[#A29E93]">
            {manual ? "Manual upload gives a limited free report and sample PDF." : "Connected accounting unlocks the full one-time free package and full intelligence path."}
          </p>
        </div>
        <div className="rounded-2xl border border-[#C9A961]/25 bg-[#C9A961]/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C9A961]">Recommended Package</p>
          <p className="mt-1 text-lg font-semibold text-[#ECEBE7]">{packageLabel}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85 p-4">
          <p className="text-sm font-semibold text-[#C9A961]">Found</p>
          <div className="mt-3 grid gap-2 text-sm text-[#A29E93]">
            {reportSummary.found.length ? reportSummary.found.map((report) => <span key={report.id}>✓ {report.label}</span>) : <span>No reports found yet.</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/85 p-4">
          <p className="text-sm font-semibold text-[#E89890]">Missing</p>
          <div className="mt-3 grid gap-2 text-sm text-[#7A7974]">
            {reportSummary.missing.length ? reportSummary.missing.map((report) => <span key={report.id}>× {report.label}</span>) : <span>No missing reports detected.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112]/70 p-4">
      <p className="text-sm font-semibold text-[#ECEBE7]">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#A29E93]">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function UploadReportInput({ label, required, selected, onChange }: { label: string; required: boolean; selected: boolean; onChange: (selected: boolean) => void }) {
  return (
    <label className={`grid gap-2 rounded-2xl border p-4 text-sm font-bold ${selected ? "border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961]" : "border-[#C9A961]/20 bg-[#111112]/70 text-[#A29E93]"}`}>
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A7974]">{required ? "Required" : "Optional"}</span>
      </span>
      <input
        type="file"
        accept=".csv,.xlsx,.xls,.pdf"
        onChange={(event) => onChange(Boolean(event.target.files?.length))}
        className="block w-full cursor-pointer rounded-xl border border-[#C9A961]/20 bg-[#111112]/85 text-xs text-[#A29E93] file:mr-3 file:border-0 file:bg-[#C9A961] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#111112]"
      />
      <span className="text-xs text-[#7A7974]">{selected ? "File selected" : "CSV, Excel, or PDF"}</span>
    </label>
  );
}

function ChoiceGrid({ options, selected, onSelect, help }: { options: Array<{ id: string; label: string; description: string }>; selected: string; onSelect: (value: string) => void; help?: HelpContent }) {
  return (
    <div className="grid gap-4">
      {help && (
        <div className="flex items-center gap-2 text-sm font-semibold text-[#A29E93]">
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
            className={focusRing(`rounded-3xl border p-5 text-left transition ${
              selected === option.id ? "border-[#C9A961]/70 bg-[#C9A961]/15" : "border-[#C9A961]/20 bg-[#111112]/85 hover:border-[#C9A961]/50"
            }`)}
          >
            <p className={`text-lg font-semibold text-[#ECEBE7] ${headingFont}`}>{option.label}</p>
            <p className="mt-2 text-sm leading-6 text-[#7A7974]">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#111112] p-6 text-[#ECEBE7]">Loading onboarding...</main>}>
      <OnboardingContent />
    </Suspense>
  );
}
