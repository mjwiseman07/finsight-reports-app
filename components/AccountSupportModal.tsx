"use client";

import Link from "next/link";
import React from "react";
import { supabase } from "../lib/supabase";
import { humanNameForSignalKind } from "../lib/support/human-names";
import { primaryCtaClass } from "./site-ui";

interface AccountSupportModalProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
}

interface RecentTicket {
  id: string;
  ticket_number: number | null;
  subject: string;
  status: string;
  correlation_id: string | null;
  created_at: string;
}

interface PrefillSignal {
  kind: string;
  severity: string;
}

export function AccountSupportModal({ open, onClose, userEmail }: AccountSupportModalProps) {
  const [tickets, setTickets] = React.useState<RecentTicket[]>([]);
  const [signals, setSignals] = React.useState<PrefillSignal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [lookupValue, setLookupValue] = React.useState("");
  const [lookupResult, setLookupResult] = React.useState<RecentTicket | null>(null);
  const [lookupMiss, setLookupMiss] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const token = typeof window !== "undefined" ? window.localStorage.getItem("supabase_access_token") || "" : "";
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch("/api/support/tickets", { headers }).then((r) => r.json()).catch(() => ({ tickets: [] })),
      fetch("/api/support/prefill", { headers }).then((r) => r.json()).catch(() => ({ signals: [] })),
    ])
      .then(([ticketsResp, prefillResp]) => {
        if (cancelled) return;
        const list: Array<Record<string, unknown>> = Array.isArray(ticketsResp?.tickets)
          ? ticketsResp.tickets
          : [];
        setTickets(
          list.slice(0, 5).map((t) => ({
            id: String(t.id || ""),
            ticket_number: (t.ticket_number ?? t.ticketNumber ?? null) as number | null,
            subject: String(t.subject || "").slice(0, 120),
            status: String(t.status || "Open"),
            correlation_id: (t.correlation_id ?? t.correlationId ?? null) as string | null,
            created_at: String(t.created_at ?? t.createdAt ?? ""),
          })),
        );
        setSignals(Array.isArray(prefillResp?.signals) ? prefillResp.signals : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runLookup = () => {
    const q = lookupValue.trim();
    if (!q) return;
    const match = tickets.find((t) => (t.correlation_id || "").toLowerCase().startsWith(q.toLowerCase()));
    if (match) {
      setLookupResult(match);
      setLookupMiss(false);
    } else {
      setLookupResult(null);
      setLookupMiss(true);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };

  if (!open) return null;

  const sectionHeaderClass = "text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A961]";
  const cardClass = "rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-4";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-support-modal-title"
        className="w-full max-w-2xl rounded-3xl border border-[#C9A961]/30 bg-[#1A1A1C] p-6 text-[#ECEBE7] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={sectionHeaderClass}>Advisacor</p>
            <h2 id="account-support-modal-title" className="mt-2 text-2xl font-semibold">
              Account &amp; Support
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#111112] px-4 py-2 text-xs font-semibold text-[#ECEBE7] transition-colors hover:bg-[#111112]/80"
          >
            Close
          </button>
        </div>

        <section className="mt-6">
          <p className={sectionHeaderClass}>Account</p>
          <div className={`${cardClass} mt-2 flex items-center justify-between gap-3`}>
            <div className="min-w-0">
              <p className="text-xs text-[#7A7974]">Signed in as</p>
              <p className="mt-1 truncate text-sm font-semibold">{userEmail || "—"}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-[#C9A961]/20 px-3 py-2 text-xs font-semibold text-[#A29E93] hover:bg-[#1A1A1C]/50"
            >
              Sign out
            </button>
          </div>
        </section>

        <section className="mt-6">
          <p className={sectionHeaderClass}>Connection health</p>
          <div className={`${cardClass} mt-2`}>
            {loading ? (
              <p className="text-sm text-[#A29E93]">Checking…</p>
            ) : signals.length === 0 ? (
              <p className="text-sm text-[#A29E93]">Everything looks connected.</p>
            ) : (
              <ul className="space-y-1">
                {signals.map((s, i) => (
                  <li key={`${s.kind}-${i}`} className="flex items-start gap-2 text-sm text-[#ECEBE7]">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        s.severity === "high"
                          ? "bg-red-400"
                          : s.severity === "medium"
                            ? "bg-[#C9A961]"
                            : "bg-[#7A7974]"
                      }`}
                      aria-hidden="true"
                    />
                    <span>{humanNameForSignalKind(s.kind)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-6">
          <p className={sectionHeaderClass}>Recent tickets</p>
          <div className={`${cardClass} mt-2`}>
            {loading ? (
              <p className="text-sm text-[#A29E93]">Loading…</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-[#A29E93]">You haven&apos;t filed any tickets yet.</p>
            ) : (
              <ul className="divide-y divide-[#C9A961]/20">
                {tickets.map((t) => (
                  <li key={t.id} className="py-2 first:pt-0 last:pb-0">
                    <Link
                      href={`/support?ticket=${encodeURIComponent(t.id)}`}
                      className="-mx-2 block rounded-lg px-2 hover:bg-[#111112]/80"
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-semibold text-[#ECEBE7]">
                          {t.ticket_number != null ? `#${t.ticket_number} · ` : ""}
                          {t.subject || "(no subject)"}
                        </span>
                        <span className="shrink-0 text-xs text-[#7A7974]">{t.status}</span>
                      </div>
                      {t.correlation_id && (
                        <p className="mt-1 text-xs text-[#7A7974]">
                          Correlation: <code>{t.correlation_id.slice(0, 8)}</code>
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-6">
          <p className={sectionHeaderClass}>Get help</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Link
              href="/support?context=account_modal"
              className={`${cardClass} text-sm font-semibold text-[#ECEBE7] hover:border-[#C9A961]`}
            >
              File a new ticket
            </Link>
            <Link
              href="/support#articles"
              className={`${cardClass} text-sm font-semibold text-[#ECEBE7] hover:border-[#C9A961]`}
            >
              Read support articles
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
                document.dispatchEvent(new CustomEvent("advisacor:open-pulse"));
              }}
              className={`${cardClass} text-left text-sm font-semibold text-[#ECEBE7] hover:border-[#C9A961]`}
            >
              Ask Pulse
            </button>
          </div>
        </section>

        <section className="mt-6">
          <p className={sectionHeaderClass}>Look up a correlation ID</p>
          <div className={`${cardClass} mt-2`}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                placeholder="Paste correlation ID from your ticket email…"
                className="min-w-0 flex-1 rounded-xl border border-[#C9A961]/20 bg-[#111112] px-3 py-2 text-sm text-[#ECEBE7] outline-none placeholder:text-[#7A7974] focus:border-[#C9A961]"
              />
              <button type="button" onClick={runLookup} className={primaryCtaClass}>
                Look up
              </button>
            </div>
            {lookupResult && (
              <div className="mt-3 text-sm">
                <Link
                  href={`/support?ticket=${encodeURIComponent(lookupResult.id)}`}
                  className="text-[#C9A961] hover:underline"
                >
                  Found: {lookupResult.ticket_number != null ? `#${lookupResult.ticket_number} — ` : ""}
                  {lookupResult.subject}
                </Link>
              </div>
            )}
            {lookupMiss && (
              <p className="mt-3 text-sm text-[#A29E93]">
                No match in your recent tickets. Only your own tickets can be looked up here.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
