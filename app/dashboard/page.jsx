"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import {
  PLATFORM_PRODUCT_NAME,
  automatedExecutiveDeliveryEngine,
  automatedDeliveryOutputTypes,
  deliveryConfigurationFields,
  deliveryProcessingStatuses,
  executiveDeliveryCadences,
  executiveDeliveryOutputs,
  packageScopeRules,
  personaOutputModes,
  workspaceArchitecture,
} from "../../lib/executive-delivery-architecture";

const priceIds = {
  essential: "price_1Tanv2CYGplhrQTJhQ1riXCe",
  professional: "price_1TanxOCYGplhrQTJSv3ynV3Y",
  virtualCfo: "price_1TanyYCYGplhrQTJG82yVpJC",
};

const plans = [
  {
    key: "essential",
    name: "Essential",
    price: "$99/mo",
    description: "Core monthly reporting and KPI package automation.",
  },
  {
    key: "professional",
    name: "Professional",
    price: "$199/mo",
    description: "Advisory reporting with deeper analysis and presentation automation.",
    featured: true,
  },
  {
    key: "virtualCfo",
    name: "Virtual CFO",
    price: "$499/mo",
    description: "Premium CFO-level intelligence, flux analysis, and board-ready reporting.",
  },
];

const planRank = {
  essential: 1,
  professional: 2,
  virtualCfo: 3,
};

const planLabels = {
  essential: "Essential",
  professional: "Professional",
  virtualCfo: "Virtual CFO",
};

const featureChecks = [
  ["has_payroll", "Payroll"],
  ["has_inventory", "Inventory"],
  ["has_classes", "Class tracking"],
  ["has_budgets", "Budgets"],
  ["has_fixed_assets", "Fixed assets"],
];

const recommendationToPlanKey = {
  essential: "essential",
  professional: "professional",
  virtual_cfo: "virtualCfo",
};

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [quickBooksCapabilities, setQuickBooksCapabilities] = useState(null);
  const [quickBooksDetecting, setQuickBooksDetecting] = useState(false);
  const [recommendedPlan, setRecommendedPlan] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [businessNameDraft, setBusinessNameDraft] = useState("");
  const [deliveryPersona, setDeliveryPersona] = useState("business-owner");
  const [deliveryCadence, setDeliveryCadence] = useState("Monthly Full Package");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryDay, setDeliveryDay] = useState("5th business day");
  const [deliveryApprovalMode, setDeliveryApprovalMode] = useState("approval-required");
  const [deliveryPackageType, setDeliveryPackageType] = useState("Executive Financial Package");

  const currentPlanKey = access?.subscription_plan || null;
  const currentPlanName = currentPlanKey ? planLabels[currentPlanKey] || currentPlanKey : access?.reason === "trial" ? "Free Trial" : "No Active Plan";
  const accountEmail = access?.email || "Not available";
  const accountBusinessName = access?.business_name || "Not provided";
  const selectedPersonaMode = personaOutputModes.find((persona) => persona.id === deliveryPersona) || personaOutputModes[3];

  const readValidStoredAuthToken = useCallback((fallbackToken = "") => {
    const isInvalidJwt = (authToken) => {
      try {
        if (authToken.split(".").length !== 3) return true;
        const payload = JSON.parse(window.atob(authToken.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") || ""));
        return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
      } catch {
        return true;
      }
    };

    const storedToken = window.localStorage.getItem("supabase_access_token") || fallbackToken || "";
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
  }, []);

  const getAuthToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const sessionToken = data.session?.access_token || "";
    if (sessionToken && readValidStoredAuthToken(sessionToken)) {
      window.localStorage.setItem("supabase_access_token", sessionToken);
      return sessionToken;
    }
    if (sessionToken) await supabase.auth.signOut();

    return readValidStoredAuthToken(token);
  }, [readValidStoredAuthToken, token]);

  useEffect(() => {
    const loadAccess = async () => {
      const devBypass =
        process.env.NODE_ENV === "development" &&
        new URLSearchParams(window.location.search).get("x-dev-bypass") === "true";
      const storedToken = await getAuthToken();

      if (!storedToken && !devBypass) {
        router.replace("/signin");
        return;
      }

      setToken(storedToken || "");

      try {
        const response = await fetch(devBypass ? "/api/check-trial?x-dev-bypass=true" : "/api/check-trial", {
          method: "POST",
          headers: {
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
            ...(devBypass ? { "x-dev-bypass": "true" } : {}),
          },
        });

        if (response.status === 401) {
          window.localStorage.removeItem("supabase_access_token");
          router.replace("/signin");
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load dashboard access.");
          return;
        }

        setAccess(result);
        setBusinessNameDraft(result.business_name || "");
      } catch {
        setError("Unable to load dashboard access.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAccess();
  }, [getAuthToken, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.localStorage.removeItem("supabase_access_token");
    router.push("/signin");
  };

  const handleSubscribe = async (planKey) => {
    setError("");
    setCheckoutPlan(planKey);

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: priceIds[planKey],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.url) {
        setError(result.error || "Unable to start checkout. Please try again.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setCheckoutPlan("");
    }
  };

  const handleManageBilling = async () => {
    setError("");
    setBillingLoading(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then manage billing.");
        return;
      }

      const response = await fetch("/api/create-billing-portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json();

      if (!response.ok || !result.url) {
        setError(result.error || "Unable to open billing portal.");
        return;
      }

      window.location.assign(result.url);
    } catch {
      setError("Unable to open billing portal.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    setError("");
    setAccountSaving(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then update your account.");
        return;
      }

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ business_name: businessNameDraft }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to update account.");
        return;
      }

      setAccess((current) => ({
        ...current,
        business_name: result.business_name || "",
        email: result.email || current?.email || "",
      }));
    } catch {
      setError("Unable to update account.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleConnectQuickBooks = async () => {
    setError("");
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setError("Sign in first, then connect QuickBooks.");
        return;
      }

      const response = await fetch("/api/quickbooks/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        setError(result.error || "Unable to start QuickBooks connection.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError("Unable to start QuickBooks connection.");
    }
  };

  const handleDetectQuickBooksCapabilities = async () => {
    setError("");
    setQuickBooksDetecting(true);
    try {
      const authToken = await getAuthToken();
      const response = await fetch("/api/quickbooks/detect-capabilities", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Connect QuickBooks first, then run plan recommendation.");
        return;
      }
      setQuickBooksCapabilities(result);
      setRecommendedPlan(recommendationToPlanKey[result.recommended_package] || "professional");
    } catch {
      setError("Unable to detect QuickBooks capabilities.");
    } finally {
      setQuickBooksDetecting(false);
    }
  };

  return (
    <main className="advisacor-dark-grid min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-4 z-40 flex items-center justify-between rounded-3xl border border-white/10 bg-[#0A1020]/72 px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <Link href="/" className="rounded-2xl bg-white p-3 shadow-xl shadow-black/20">
            <AdvisacorLogo priority className="w-[210px]" />
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="rounded-2xl border border-[#FF7A1A]/30 bg-[#FF7A1A]/10 px-4 py-2 text-sm font-bold text-[#FFD0AB] transition hover:border-[#FF7A1A]/60 hover:bg-[#FF7A1A]/20"
            >
              Account
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-2xl border border-white/15 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </header>

        <section className="py-12">
          {isLoading && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
              <p className="text-lg font-bold text-slate-300">Loading your dashboard...</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-200">
              {error}
            </div>
          )}

          {!isLoading && access?.allowed === true && access.reason === "trial" && (
            <div className="grid gap-8">
              <div className="rounded-[2rem] border border-blue-300/30 bg-blue-500/10 p-8 shadow-2xl shadow-blue-500/10">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Connect QuickBooks to get your recommended plan</p>
                <h1 className="mt-4 text-4xl font-black">Match {PLATFORM_PRODUCT_NAME} to the reports your QuickBooks can provide.</h1>
                <p className="mt-4 max-w-3xl leading-8 text-slate-300">
                  We will inspect your connected QuickBooks features, recommend the best {PLATFORM_PRODUCT_NAME} package, and still let you choose any plan.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConnectQuickBooks}
                    className="premium-button rounded-2xl px-6 py-4 text-sm font-black text-white"
                  >
                    Connect QuickBooks
                  </button>
                  <button
                    type="button"
                    onClick={handleDetectQuickBooksCapabilities}
                    disabled={quickBooksDetecting}
                    className="rounded-2xl border border-white/15 bg-slate-950 px-6 py-4 text-sm font-black text-slate-100 transition hover:border-blue-300/50 disabled:opacity-60"
                  >
                    {quickBooksDetecting ? "Detecting..." : "Detect Capabilities"}
                  </button>
                  <Link
                    href="/upload"
                    className="rounded-2xl border border-white/15 px-6 py-4 text-sm font-black text-slate-100 transition hover:border-white/30"
                  >
                    Skip and Generate Trial Report
                  </Link>
                </div>
              </div>

              {quickBooksCapabilities && (
                <div className="rounded-[2rem] border border-blue-300/30 bg-white/[0.04] p-8">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Recommended Plan</p>
                  <h2 className="mt-3 text-3xl font-black">
                    Based on your QuickBooks {quickBooksCapabilities.qbo_version}, we recommend the{" "}
                    {plans.find((plan) => plan.key === recommendedPlan)?.name || "Professional"} plan.
                  </h2>
                  {quickBooksCapabilities.mismatch_warning && (
                    <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
                      {quickBooksCapabilities.mismatch_warning}
                    </p>
                  )}
                  {quickBooksCapabilities.missing_virtual_cfo_features?.length > 0 && (
                    <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">
                      Your QuickBooks plan does not include {quickBooksCapabilities.missing_virtual_cfo_features.join(", ")}. Consider upgrading QuickBooks or choose Professional instead.
                    </p>
                  )}
                  <div className="mt-6 grid gap-3 md:grid-cols-5">
                    {featureChecks.map(([key, label]) => (
                      <div key={key} className={`rounded-2xl border px-4 py-3 ${quickBooksCapabilities[key] ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-slate-950/60 text-slate-500"}`}>
                        <p className="text-sm font-black">{quickBooksCapabilities[key] ? "✓" : "○"} {label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                {plans.map((plan) => {
                  const recommended = recommendedPlan ? plan.key === recommendedPlan : plan.featured;
                  return (
                    <div
                      key={plan.key}
                      className={`rounded-[2rem] border p-8 ${
                        recommended ? "border-[#FF7A1A]/60 bg-[#FF7A1A]/15 shadow-2xl shadow-[#FF7A1A]/20" : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <p className={`text-sm font-black uppercase tracking-[0.18em] ${recommended ? "text-white" : "text-blue-200"}`}>
                        {plan.name} {recommended ? "Recommended" : ""}
                      </p>
                      <h2 className="mt-4 text-5xl font-black">{plan.price}</h2>
                      <p className={`mt-4 min-h-20 leading-7 ${recommended ? "text-blue-50" : "text-slate-300"}`}>{plan.description}</p>
                      <button
                        type="button"
                        onClick={() => handleSubscribe(plan.key)}
                        disabled={checkoutPlan === plan.key}
                        className={`mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          recommended ? "bg-white text-[#0A1020] hover:bg-orange-50" : "premium-button text-white"
                        }`}
                      >
                        {checkoutPlan === plan.key ? "Starting checkout..." : `Choose ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isLoading && access?.allowed === false && access.reason === "trial_expired" && (
            <div>
              <div className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Choose a Plan</p>
                <h1 className="mt-4 text-4xl font-black">Your free trial has been used. Choose a plan to continue.</h1>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan.key}
                    className={`rounded-[2rem] border p-8 ${
                      plan.featured
                        ? "border-[#FF7A1A]/40 bg-[#FF7A1A]/15 shadow-2xl shadow-[#FF7A1A]/20"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <p className={`text-sm font-black uppercase tracking-[0.18em] ${plan.featured ? "text-white" : "text-blue-200"}`}>
                      {plan.name}
                    </p>
                    <h2 className="mt-4 text-5xl font-black">{plan.price}</h2>
                    <p className={`mt-4 min-h-20 leading-7 ${plan.featured ? "text-blue-50" : "text-slate-300"}`}>
                      {plan.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={checkoutPlan === plan.key}
                      className={`mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        plan.featured
                          ? "bg-white text-[#0A1020] hover:bg-orange-50"
                          : "premium-button text-white"
                      }`}
                    >
                      {checkoutPlan === plan.key ? "Starting checkout..." : "Subscribe"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && access?.allowed === true && access.reason === "subscriber" && (
            <div>
              <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-8">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">Active Subscriber</p>
                <h1 className="mt-4 text-4xl font-black">Your {PLATFORM_PRODUCT_NAME} workspace is ready.</h1>
                <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                  Generate new reports, manage client packages, configure delivery automation, and continue creating board-ready deliverables.
                </p>
                <Link
                  href="/upload"
                  className="premium-button mt-8 inline-flex rounded-2xl px-6 py-4 text-sm font-black text-white"
                >
                  Generate New Report
                </Link>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {["Reports Generated", "Package Status", "Subscription"].map((label, index) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-sm font-bold text-slate-400">{label}</p>
                    <p className="mt-4 text-3xl font-black">{index === 0 ? "Ready" : index === 1 ? "Active" : "Current"}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[2rem] border border-blue-300/20 bg-blue-500/10 p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Automated Executive Delivery</p>
                    <h2 className="mt-3 text-3xl font-black">Executive delivery automation architecture</h2>
                    <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                      {automatedExecutiveDeliveryEngine.positioning} Package level controls intelligence scope while persona controls output wording, depth, visuals, recommendations, report structure, AI tone, and email summaries.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4">
                    <p className="text-sm font-black text-emerald-200">{automatedExecutiveDeliveryEngine.readyMessage}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-black text-blue-100">Recurring Outputs</p>
                    <div className="mt-4 grid gap-2">
                      {executiveDeliveryOutputs.slice(0, 5).map((item) => (
                        <p key={item} className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">{item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-black text-blue-100">Scheduler Examples</p>
                    <div className="mt-4 grid gap-2">
                      {executiveDeliveryCadences.map((item) => (
                        <p key={item} className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200">{item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-black text-blue-100">Workspace Split</p>
                    <div className="mt-4 grid gap-2">
                      {workspaceArchitecture.map((workspace) => (
                        <div key={workspace.name} className="rounded-2xl bg-slate-950/60 px-4 py-3">
                          <p className="text-sm font-black text-white">{workspace.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{workspace.audience}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 p-8">
                <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Persona-Based Outputs</p>
                    <h2 className="mt-3 text-3xl font-black">One intelligence engine. Four presentation layers.</h2>
                    <p className="mt-3 leading-7 text-slate-300">
                      {automatedExecutiveDeliveryEngine.coreRule}
                    </p>
                    <div className="mt-5 grid gap-3">
                      {personaOutputModes.map((persona) => (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={() => setDeliveryPersona(persona.id)}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            deliveryPersona === persona.id
                              ? "border-[#FF7A1A]/70 bg-[#FF7A1A]/20"
                              : "border-white/10 bg-slate-950/50 hover:border-white/25"
                          }`}
                        >
                          <p className="text-sm font-black text-white">{persona.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{persona.positioning}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selected Output Style</p>
                    <h3 className="mt-3 text-2xl font-black text-white">{selectedPersonaMode.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{selectedPersonaMode.outputStyle}</p>
                    <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
                      AI tone: {selectedPersonaMode.aiAssistantTone}
                    </p>
                    {selectedPersonaMode.translationExample && (
                      <div className="mt-4 rounded-2xl border border-[#1E6BFF]/25 bg-[#1E6BFF]/10 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Owner Translation Example</p>
                        <p className="mt-2 text-sm text-slate-300">{selectedPersonaMode.translationExample.ownerFacing}</p>
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedPersonaMode.focus.slice(0, 8).map((item) => (
                        <span key={item} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Delivery Configuration</p>
                    <h2 className="mt-3 text-3xl font-black">Configure recurring executive delivery</h2>
                    <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                      Configure the delivery layer while async processing handles ERP sync, AI commentary, PDF/PPT generation, approval status, and email delivery without freezing the frontend.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Status Flow</p>
                    <p className="mt-2 text-sm font-bold text-slate-200">{deliveryProcessingStatuses.join(" -> ")}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Recipient Email</span>
                    <input
                      value={deliveryEmail}
                      onChange={(event) => setDeliveryEmail(event.target.value)}
                      placeholder={accountEmail}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#FF7A1A]/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Delivery Cadence</span>
                    <select
                      value={deliveryCadence}
                      onChange={(event) => setDeliveryCadence(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF7A1A]/60"
                    >
                      {executiveDeliveryCadences.map((cadence) => (
                        <option key={cadence}>{cadence}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Package Type</span>
                    <select
                      value={deliveryPackageType}
                      onChange={(event) => setDeliveryPackageType(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF7A1A]/60"
                    >
                      <option>Executive Financial Package</option>
                      <option>Weekly KPI Snapshot</option>
                      <option>Board Review Package</option>
                      <option>Controller Review Package</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Persona Output Style</span>
                    <select
                      value={deliveryPersona}
                      onChange={(event) => setDeliveryPersona(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF7A1A]/60"
                    >
                      {personaOutputModes.map((persona) => (
                        <option key={persona.id} value={persona.id}>{persona.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Delivery Day</span>
                    <input
                      value={deliveryDay}
                      onChange={(event) => setDeliveryDay(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF7A1A]/60"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Approval</span>
                    <select
                      value={deliveryApprovalMode}
                      onChange={(event) => setDeliveryApprovalMode(event.target.value)}
                      className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#FF7A1A]/60"
                    >
                      <option value="approval-required">Approval required before send</option>
                      <option value="auto-send">Auto-send after generation</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  {automatedDeliveryOutputTypes.map((output) => (
                    <div key={output.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                      <p className="text-sm font-black text-white">{output.label}</p>
                      <p className="mt-1 text-xs font-bold text-[#FFB36F]">{output.availability}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{output.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Configuration Fields</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {deliveryConfigurationFields.map((field) => (
                        <span key={field} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Package Scope Still Applies</p>
                    <div className="mt-3 grid gap-2">
                      {packageScopeRules.map((rule) => (
                        <p key={rule.packageName} className="text-sm leading-6 text-slate-400">
                          <span className="font-black text-slate-200">{rule.packageName}:</span> {rule.scope}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {accountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40">
            <div className="shrink-0 border-b border-white/10 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Account</p>
                  <h2 className="mt-2 text-3xl font-black">Account and package settings</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Review your account, current package, and available plan changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountOpen(false)}
                  className="rounded-2xl border border-white/15 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email</p>
                  <p className="mt-3 break-words text-lg font-black text-white">{accountEmail}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Firm / Business</p>
                  <input
                    type="text"
                    value={businessNameDraft}
                    onChange={(event) => setBusinessNameDraft(event.target.value)}
                    placeholder={accountBusinessName}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-300/60"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    disabled={accountSaving}
                    className="mt-3 rounded-2xl bg-[#1a6cf6] px-4 py-2 text-xs font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {accountSaving ? "Saving..." : "Save Account Info"}
                  </button>
                </div>
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Current Package</p>
                  <p className="mt-3 text-lg font-black text-white">{currentPlanName}</p>
                  <p className="mt-2 text-sm font-semibold capitalize text-emerald-100/80">
                    {access?.subscription_status || access?.reason || "Loading"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">Package Options</p>
                    <h3 className="mt-2 text-2xl font-black">Upgrade or downgrade your package</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Active subscriptions are managed in Stripe billing. Trial or expired accounts can choose a package here.
                    </p>
                  </div>
                  {access?.reason === "subscriber" && (
                    <button
                      type="button"
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                      className="rounded-2xl bg-[#1a6cf6] px-5 py-3 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {billingLoading ? "Opening billing..." : "Manage Billing"}
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isCurrentPlan = currentPlanKey === plan.key;
                    const planMove =
                      currentPlanKey && !isCurrentPlan
                        ? planRank[plan.key] > planRank[currentPlanKey]
                          ? "Upgrade"
                          : "Downgrade"
                        : "Current";
                    return (
                      <div
                        key={plan.key}
                        className={`rounded-3xl border p-5 ${
                          isCurrentPlan ? "border-emerald-300/40 bg-emerald-400/10" : "border-white/10 bg-slate-950/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{plan.name}</p>
                            <p className="mt-1 text-2xl font-black">{plan.price}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${
                            isCurrentPlan ? "bg-emerald-400/15 text-emerald-200" : "bg-blue-500/15 text-blue-200"
                          }`}>
                            {isCurrentPlan ? "Current" : planMove}
                          </span>
                        </div>
                        <p className="mt-3 min-h-16 text-sm leading-6 text-slate-400">{plan.description}</p>
                        {access?.reason === "subscriber" ? (
                          <button
                            type="button"
                            onClick={handleManageBilling}
                            disabled={billingLoading || isCurrentPlan}
                            className="mt-5 w-full rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-sm font-black text-slate-100 transition hover:border-blue-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isCurrentPlan ? "Current Package" : `${planMove} in Billing`}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSubscribe(plan.key)}
                            disabled={checkoutPlan === plan.key}
                            className="mt-5 w-full rounded-2xl bg-[#1a6cf6] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {checkoutPlan === plan.key ? "Starting checkout..." : `Choose ${plan.name}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
