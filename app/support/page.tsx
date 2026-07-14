"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";
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
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className={`${headingFont} text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]`}>
            Advisacor Support Center
          </p>
          <Link
            href="/dashboard"
            className={`${headingFont} rounded-full border border-[#C9A961]/30 bg-transparent px-4 py-2 text-sm font-black text-[#ECEBE7] transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10`}
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="mt-6 rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C]/85 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h1 className={`${headingFont} text-4xl font-black tracking-[-0.04em] text-white md:text-5xl`}>
            Get help without getting stuck.
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-[#A29E93]">
            Request help, report issues, ask onboarding questions, submit feature requests, and track every ticket in one place.
          </p>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/70 p-6">
            <h2 className={`${headingFont} text-2xl font-black text-white`}>Submit Support Ticket</h2>
            <div className="mt-5">
              <SupportTicketForm onSubmitted={() => void loadTickets()} />
            </div>
          </section>

          <section className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/70 p-6">
            <h2 className={`${headingFont} text-2xl font-black text-white`}>My Support Tickets</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {supportTicketStatuses.map((status) => (
                <span
                  key={status}
                  className={`${headingFont} rounded-full border border-[#C9A961]/20 bg-[#111112] px-3 py-1 text-xs font-black text-[#A29E93]`}
                >
                  {status}
                </span>
              ))}
            </div>

            {isLoading && (
              <p className="mt-5 text-sm font-bold text-[#A29E93]">Loading tickets...</p>
            )}
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-2xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 p-4 text-sm font-bold text-[#F0BFBF]"
              >
                {error}
              </p>
            )}

            <div className="mt-5 grid gap-3">
              {tickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className={`${headingFont} text-sm font-black text-white`}>
                      Ticket #{ticket.ticketNumber}
                    </p>
                    <span className={`${headingFont} rounded-full border border-[#6DAA45]/40 bg-[#6DAA45]/10 px-3 py-1 text-xs font-black text-[#B5E28A]`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className={`${headingFont} mt-2 font-black text-[#ECEBE7]`}>{ticket.subject}</p>
                  <p className={`${headingFont} mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#7A7974]`}>
                    {ticket.category} · {ticket.priority} · {ticket.type}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#A29E93]">
                    {ticket.description}
                  </p>
                </article>
              ))}

              {!isLoading && !error && tickets.length === 0 && (
                <p className="rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/70 p-4 text-sm font-bold text-[#A29E93]">
                  No support tickets yet.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
