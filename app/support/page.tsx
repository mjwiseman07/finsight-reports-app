"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { SupportTicketForm } from "../../components/SupportTicketForm";
import { supportTicketStatuses } from "../../lib/support-center";

type SupportTicket = {
  id: string;
  ticketNumber: number | string;
  category: string;
  type: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  createdAt: string;
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setError("");
    setIsLoading(true);

    try {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        setError("Please sign in to view support tickets.");
        return;
      }

      const response = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to load support tickets.");
        return;
      }

      setTickets(result.tickets || []);
    } catch {
      setError("Unable to load support tickets.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <Link href="/dashboard" className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-slate-100">
            Back to Dashboard
          </Link>
        </header>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Advisacor Support Center</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">Get help without getting stuck.</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-300">
            Request help, report issues, ask onboarding questions, submit feature requests, and track every ticket in one place.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            <h2 className="text-2xl font-black">Submit Support Ticket</h2>
            <div className="mt-5">
              <SupportTicketForm onSubmitted={() => void loadTickets()} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
            <h2 className="text-2xl font-black">My Support Tickets</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {supportTicketStatuses.map((status) => (
                <span key={status} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">
                  {status}
                </span>
              ))}
            </div>
            {isLoading && <p className="mt-5 text-sm font-bold text-slate-400">Loading tickets...</p>}
            {error && <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">{error}</p>}
            <div className="mt-5 grid gap-3">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">Ticket #{ticket.ticketNumber}</p>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">{ticket.status}</span>
                  </div>
                  <p className="mt-2 font-black text-slate-100">{ticket.subject}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {ticket.category} · {ticket.priority} · {ticket.type}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{ticket.description}</p>
                </article>
              ))}
              {!isLoading && !error && tickets.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-400">
                  No support tickets yet.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
