"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { focusRing, headingFont, primaryCtaClass } from "@/components/site-ui";

type LeadForm = {
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone: string;
};

function FreeReviewLeadCapture() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<LeadForm>({
    first_name: "",
    last_name: "",
    business_name: "",
    email: "",
    phone: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateForm = (key: keyof LeadForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitLead = async () => {
    setError("");
    setIsSaving(true);
    try {
      const utmTrackingData = Object.fromEntries(
        Array.from(searchParams?.entries() || []).filter(([key]) => key.startsWith("utm_")),
      );
      const response = await fetch("/api/free-review/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source_page: searchParams?.get("source") || "free-review",
          referral_information: document.referrer || searchParams?.get("ref") || "",
          utm_tracking_data: utmTrackingData,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.lead?.id) {
        setError(result.error || "Unable to save your free review information.");
        return;
      }
      window.localStorage.setItem("advisacor_free_review_lead_id", result.lead.id);
      window.localStorage.setItem("advisacor_free_review_lead_email", result.lead.email || form.email);
      router.push(`/onboarding?leadId=${encodeURIComponent(result.lead.id)}`);
    } catch {
      setError("Unable to save your free review information.");
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit = Boolean(
    form.first_name.trim() &&
      form.last_name.trim() &&
      form.business_name.trim() &&
      form.email.trim().includes("@"),
  );

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Free Financial Review</p>
            <h1 className={`${headingFont} mt-4 text-5xl font-black leading-[1.02] tracking-[-0.05em] text-white md:text-7xl`}>
              Generate My Free Financial Review
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#A29E93]">
              Start with a short lead form so Advisacor can save your review session, follow up if onboarding is incomplete, and personalize your first package.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Lead captured before onboarding",
                "QuickBooks can enrich the record",
                "Upload only if accounting data is incomplete",
                "Guided path to first package",
                "Follow-up ready for incomplete sessions",
                "No manual details if Advisacor can import them",
              ].map((item) => (
                <p key={item} className="rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/70 px-4 py-3 text-sm font-bold text-[#ECEBE7]">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C]/85 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <p className={`${headingFont} text-sm font-black uppercase tracking-[0.18em] text-[#C9A961]`}>Lead Capture</p>
            <h2 className={`${headingFont} mt-2 text-3xl font-black tracking-[-0.035em] text-white`}>Tell us where to send your review</h2>
            <p className="mt-3 text-sm leading-6 text-[#A29E93]">
              Required before connecting QuickBooks, uploading reports, or generating your free package.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <LeadField label="First name" value={form.first_name} onChange={(value) => updateForm("first_name", value)} />
              <LeadField label="Last name" value={form.last_name} onChange={(value) => updateForm("last_name", value)} />
              <LeadField label="Business name" value={form.business_name} onChange={(value) => updateForm("business_name", value)} className="md:col-span-2" />
              <LeadField label="Email address" value={form.email} onChange={(value) => updateForm("email", value)} type="email" />
              <LeadField label="Phone number (optional)" value={form.phone} onChange={(value) => updateForm("phone", value)} type="tel" />
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-2xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 px-4 py-3 text-sm font-bold text-[#F0BFBF]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submitLead}
              disabled={!canSubmit || isSaving}
              className={`${primaryCtaClass} mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isSaving ? "Saving..." : "Continue to Free Review Onboarding"}
            </button>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/70 p-7">
            <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>What Happens Next</p>
            <h2 className={`${headingFont} mt-3 text-4xl font-black tracking-[-0.04em] text-white`}>
              Capture, connect, review.
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[
                ["Lead record created", "First name, last name, business name, email, phone, source, referral, and UTM data are saved immediately."],
                ["Guided onboarding opens", "The user selects customer type, then chooses QuickBooks or report upload."],
                ["QuickBooks enriches the lead", "Imported company profile and report-discovery details are attached when available."],
                ["First package begins", "Advisacor generates the first review after data connection or required uploads."],
              ].map(([title, body]) => (
                <PreviewCard key={title} title={title} body={body} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#C9A961]/25 bg-[#111112] p-7 shadow-2xl shadow-black/40">
            <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>Conversion Workflow</p>
            <h2 className={`${headingFont} mt-3 text-3xl font-black text-white`}>Incomplete sessions are follow-up ready.</h2>
            <p className="mt-4 leading-7 text-[#A29E93]">
              Capturing every free-review prospect before onboarding gives Advisacor a clean recovery path for users who start but do not finish connecting data or generating their first package.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function LeadField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-black text-[#ECEBE7]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${focusRing("rounded-2xl")} rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm text-[#ECEBE7] outline-none transition placeholder:text-[#7A7974] focus:border-[#C9A961]/70`}
      />
    </label>
  );
}

function PreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-5">
      <p className={`${headingFont} text-sm font-black text-[#C9A961]`}>{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#A29E93]">{body}</p>
    </div>
  );
}

export default function FreeReviewPage() {
  return (
    <Suspense>
      <FreeReviewLeadCapture />
    </Suspense>
  );
}
