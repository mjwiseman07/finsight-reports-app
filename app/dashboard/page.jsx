"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [access, setAccess] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState("");

  useEffect(() => {
    const loadAccess = async () => {
      const storedToken = window.localStorage.getItem("supabase_access_token");

      if (!storedToken) {
        router.replace("/signin");
        return;
      }

      setToken(storedToken);

      try {
        const response = await fetch("/api/check-trial", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${storedToken}`,
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
      } catch {
        setError("Unable to load dashboard access.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAccess();
  }, [router]);

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

      window.location.href = result.url;
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setCheckoutPlan("");
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 shadow-xl shadow-black/20">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a6cf6]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 16L10 11L13 14L19 7" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 7H19V10" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-xl font-black">FinSight</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-2xl border border-white/15 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white"
          >
            Sign Out
          </button>
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
            <div className="rounded-[2rem] border border-blue-300/30 bg-blue-500/10 p-8 shadow-2xl shadow-blue-500/10">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Free Trial</p>
              <h1 className="mt-4 text-4xl font-black">Welcome — you have 1 free report remaining</h1>
              <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                Generate your first client-ready financial package and experience the full reporting workflow.
              </p>
              <Link
                href="/upload"
                className="mt-8 inline-flex rounded-2xl bg-[#1a6cf6] px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-500"
              >
                Generate My Free Report
              </Link>
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
                        ? "border-blue-300/40 bg-[#1a6cf6] shadow-2xl shadow-blue-500/25"
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
                          ? "bg-white text-[#1a6cf6] hover:bg-blue-50"
                          : "bg-[#1a6cf6] text-white hover:bg-blue-500"
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
                <h1 className="mt-4 text-4xl font-black">Your FinSight dashboard is ready.</h1>
                <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                  Generate new reports, manage client packages, and continue creating board-ready deliverables.
                </p>
                <Link
                  href="/upload"
                  className="mt-8 inline-flex rounded-2xl bg-[#1a6cf6] px-6 py-4 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-500"
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
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
