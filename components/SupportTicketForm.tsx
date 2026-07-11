"use client";

import { useState } from "react";
import { supportTicketCategories, supportTicketPriorities } from "../lib/support-center";

type SubmitResult = {
  ticket?: { ticketNumber?: number | string };
  message?: string;
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
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A961]">Ask Advisacor Support AI</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Future architecture: Advisacor Support AI will try to answer onboarding, setup, package, and report questions before a ticket is submitted. If unresolved, the ticket will include the support AI context.
        </p>
      </div>

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
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} className="rounded-2xl border border-white/10 bg-[#111112] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#C9A961]/50" />
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

      <button type="button" onClick={() => void submitTicket()} disabled={isSubmitting} className="rounded-2xl bg-[#C9A961] px-5 py-3 text-sm font-semibold text-[#0A1530] shadow-lg shadow-[#C9A961]/30 transition-colors hover:bg-[#B8975A] disabled:cursor-not-allowed disabled:opacity-60">
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
        className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-[#111112] text-xs text-slate-300 file:mr-3 file:border-0 file:bg-[#C9A961] file:px-3 file:py-3 file:text-xs file:font-semibold file:text-[#0A1530]"
      />
    </label>
  );
}
