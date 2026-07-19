"use client";

import { useEffect, useState } from "react";
import { supportTicketCategories, supportTicketPriorities } from "../lib/support-center";
import { humanNameForSignalKind } from "../lib/support/human-names";

type SubmitResult = {
  ticket?: { ticketNumber?: number | string };
  message?: string;
};

type PrefillDraftState = {
  subject: string;
  description: string;
  category: string;
  priority: string;
  confidence: string;
  attribution: {
    signals_used: string[];
    parent_ticket_id: string | null;
    parent_correlation_id: string | null;
  };
};

export function SupportTicketForm({ defaultCategory = "Onboarding", onSubmitted }: { defaultCategory?: string; onSubmitted?: () => void }) {
  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState("Normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [attachment, setAttachment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [prefillDraft, setPrefillDraft] = useState<PrefillDraftState | null>(null);
  const [prefillSignals, setPrefillSignals] = useState<{ kind: string; severity: string }[]>([]);
  const [prefillDismissed, setPrefillDismissed] = useState(false);
  const [showWhyDraft, setShowWhyDraft] = useState(false);

  useEffect(() => {
    const contextParam =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("context") : null;
    const dismissKey = `advisacor.support.prefill.dismissed.${contextParam || "none"}`;
    if (typeof window !== "undefined") {
      const flag = window.localStorage.getItem(dismissKey);
      if (flag && Number(flag) > Date.now() - 15 * 60 * 1000) {
        setPrefillDismissed(true);
        return;
      }
    }
    const token = typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
    if (!token) return;

    const url = contextParam
      ? `/api/support/prefill?context=${encodeURIComponent(contextParam)}`
      : "/api/support/prefill";
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok && j.hasDraft && j.draft) {
          setPrefillDraft(j.draft);
          setPrefillSignals(j.signals || []);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const context = params.get("context");
    if (context !== "pulse_handoff") return;

    const q = params.get("prefill_question") || "";
    const a = params.get("prefill_answer") || "";
    if (!q && !a) return;

    const composed =
      `I asked Pulse: ${q}\n\n` +
      `Pulse answered: ${a}\n\n` +
      `What I needed instead: `;

    // Set only if user hasn't typed anything yet — never clobber user input
    setDescription((current) => (current && current.trim().length > 0 ? current : composed));
    setCategory((current) => current || "Other");
    setPriority((current) => current || "Normal");

    // Focus the description textarea after the placeholder text
    requestAnimationFrame(() => {
      const el = document.getElementById("support-description") as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        const pos = composed.length;
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          /* Some browsers throw on setSelectionRange for empty textarea — ignore */
        }
      }
    });
  }, []);

  const applyDraft = (focusDescription: boolean) => {
    if (!prefillDraft) return;
    setSubject(prefillDraft.subject);
    setDescription(prefillDraft.description);
    setCategory(
      supportTicketCategories.includes(prefillDraft.category)
        ? prefillDraft.category
        : prefillDraft.category === "Support Issue"
          ? "Other"
          : "Bug Report",
    );
    setPriority(
      supportTicketPriorities.includes(prefillDraft.priority)
        ? prefillDraft.priority
        : prefillDraft.priority === "Standard"
          ? "Normal"
          : "Normal",
    );
    setPrefillDismissed(true);
    requestAnimationFrame(() => {
      const target = document.getElementById(focusDescription ? "support-description" : "support-submit");
      (target as HTMLElement | null)?.focus?.();
    });
  };

  const dismissDraft = () => {
    setPrefillDismissed(true);
    if (typeof window !== "undefined") {
      const contextParam = new URLSearchParams(window.location.search).get("context") || "none";
      window.localStorage.setItem(`advisacor.support.prefill.dismissed.${contextParam}`, String(Date.now()));
    }
  };

  const submitTicket = async () => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        setError("Please sign in before submitting a support ticket.");
        return;
      }

      const workflowContext = {
        path: typeof window !== "undefined" ? window.location.pathname : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
      };

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          priority,
          subject,
          description,
          screenshot,
          attachment,
          browser: window.navigator.userAgent,
          workflow_context: workflowContext,
          parent_ticket_id: prefillDraft?.attribution?.parent_ticket_id ?? null,
          prefill_attribution: prefillDraft
            ? { signals_used: prefillDraft.attribution.signals_used, confidence: prefillDraft.confidence }
            : null,
        }),
      });
      const result = (await response.json()) as SubmitResult & { error?: string };

      if (!response.ok) {
        setError(result.error || "Unable to submit support ticket.");
        return;
      }

      setSuccess(
        result.message ||
          `Your support request has been received.\nTicket #${result.ticket?.ticketNumber || ""}\nA member of the Advisacor support team will review your request.`,
      );
      setSubject("");
      setDescription("");
      setScreenshot("");
      setAttachment("");
      onSubmitted?.();
    } catch {
      setError("Unable to submit support ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-[#C9A961]/25 bg-[#C9A961]/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A961]">What happens when you submit</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Your ticket is delivered to the Advisacor support team and copied to your email address.
          Advisacor automatically captures your account context, connected QuickBooks Online company, browser,
          and the most recent Intuit request identifier so we can diagnose issues without a back-and-forth.
          See &quot;Response time SLAs&quot; below the form for how quickly we will respond.
        </p>
      </div>

      {prefillDraft && !prefillDismissed && (
        <div className="mb-6 rounded-2xl border border-[#C9A961]/40 bg-[#111112] p-5 text-[#ECEBE7] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#C9A961]">We drafted this for you</p>
          <p className="mt-2 text-base">{prefillDraft.subject}</p>
          <p className="mt-2 text-sm text-[#A29E93]">{prefillDraft.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyDraft(false)}
              className="rounded-xl bg-[#C9A961] px-4 py-2 text-sm font-semibold text-[#111112] hover:bg-[#B8975A]"
            >
              Use this draft
            </button>
            <button
              type="button"
              onClick={() => applyDraft(true)}
              className="rounded-xl border border-[#C9A961] px-4 py-2 text-sm font-semibold text-[#C9A961] hover:bg-[#C9A961]/10"
            >
              Edit this draft
            </button>
            <button
              type="button"
              onClick={dismissDraft}
              className="rounded-xl border border-[#C9A961]/20 px-4 py-2 text-sm font-semibold text-[#A29E93] hover:bg-[#1A1A1C]/50"
            >
              Start from blank
            </button>
          </div>
          {prefillSignals.length > 0 && (
            <button
              type="button"
              onClick={() => setShowWhyDraft((v) => !v)}
              className="mt-3 text-xs text-[#7A7974] underline"
            >
              {showWhyDraft ? "Hide" : "Why this draft?"}
            </button>
          )}
          {showWhyDraft && (
            <ul className="mt-2 space-y-1 text-xs text-[#A29E93]">
              {prefillSignals.map((s, i) => (
                <li key={`${s.kind}-${i}`}>• {humanNameForSignalKind(s.kind)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-300">
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-white/10 bg-[#111112] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#C9A961]/50">
            {supportTicketCategories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-300">
          Priority
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-2xl border border-white/10 bg-[#111112] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#C9A961]/50">
            {supportTicketPriorities.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold text-slate-300">
        Subject
        <input value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-2xl border border-white/10 bg-[#111112] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#C9A961]/50" />
      </label>

      <label className="grid gap-2 text-sm font-bold text-slate-300">
        Description
        <textarea
          id="support-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          className="rounded-2xl border border-white/10 bg-[#111112] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#C9A961]/50"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <FileNameInput label="Screenshot Upload" onChange={setScreenshot} />
        <FileNameInput label="Attachment Upload" onChange={setAttachment} />
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Advisacor automatically captures your user, company, package level, persona, browser, and timestamp. Notifications are sent to support@advisacor.com.
      </p>

      {error && <p className="rounded-2xl border border-[#B84A3E]/30 bg-[#B84A3E]/10 p-4 text-sm font-bold text-[#E89890]">{error}</p>}
      {success && <p className="whitespace-pre-line rounded-2xl border border-[#437A22]/30 bg-[#437A22]/10 p-4 text-sm font-bold text-[#8CB56C]">{success}</p>}

      <button
        id="support-submit"
        type="button"
        onClick={() => void submitTicket()}
        disabled={isSubmitting}
        className="rounded-2xl bg-[#C9A961] px-5 py-3 text-sm font-semibold text-[#111112] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Submit Support Ticket"}
      </button>
    </div>
  );
}

function FileNameInput({ label, onChange }: { label: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-300">
      {label}
      <input
        type="file"
        onChange={(event) => onChange(event.target.files?.[0]?.name || "")}
        className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-[#111112] text-xs text-slate-300 file:mr-3 file:border-0 file:bg-[#C9A961] file:px-3 file:py-3 file:text-xs file:font-semibold file:text-[#111112]"
      />
    </label>
  );
}
