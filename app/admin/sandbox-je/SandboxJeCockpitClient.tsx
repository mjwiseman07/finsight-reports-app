"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
} from "@/lib/journal-entry-governance/je3d-first-controlled-create-activation";
import {
  SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
  SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
  type SafeSandboxAllowlistResponse,
  type SafeSandboxChecklistResponse,
  type SafeSandboxInspectionResponse,
} from "@/lib/journal-entry-governance/sandbox-je-cockpit-api";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

function IdentityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[#C9A961]/15 py-3 sm:grid-cols-[220px_1fr]">
      <dt className="text-sm text-[#A29E93]">{label}</dt>
      <dd className="break-all font-mono text-sm text-[#ECEBE7]">{value}</dd>
    </div>
  );
}

function CapabilityBadge({
  label,
  enabled,
  inverted = false,
}: {
  label: string;
  enabled: boolean;
  inverted?: boolean;
}) {
  const off = inverted ? enabled : !enabled;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        off
          ? "border-[#B85C5C]/40 bg-[#B85C5C]/15 text-[#F0BFBF]"
          : "border-[#6DAA45]/40 bg-[#6DAA45]/15 text-[#B5E28A]"
      }`}
    >
      {label}: {off ? "OFF" : "ON"}
    </span>
  );
}

export default function SandboxJeCockpitClient({
  superAdminEmail,
}: {
  superAdminEmail: string;
}) {
  const [allowlist, setAllowlist] = useState<SafeSandboxAllowlistResponse | null>(
    null,
  );
  const [inspection, setInspection] =
    useState<SafeSandboxInspectionResponse | null>(null);
  const [checklist, setChecklist] =
    useState<SafeSandboxChecklistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const identity = useMemo(() => JE_3D_VERIFIED_DEMO_A_IDENTITY, []);

  const loadCockpit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allowlistRes, inspectionRes, checklistRes] = await Promise.all([
        fetch("/api/governed/journal-entries/sandbox/allowlist", {
          credentials: "include",
        }),
        fetch(
          `/api/governed/journal-entries/executions/${SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID}/inspection`,
          { credentials: "include" },
        ),
        fetch(
          `/api/governed/journal-entries/executions/${SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID}/checklist`,
          { credentials: "include" },
        ),
      ]);

      if (!allowlistRes.ok) {
        const body = await allowlistRes.json().catch(() => ({}));
        throw new Error(body.error || `Allowlist HTTP ${allowlistRes.status}`);
      }
      if (!inspectionRes.ok) {
        const body = await inspectionRes.json().catch(() => ({}));
        throw new Error(body.error || `Inspection HTTP ${inspectionRes.status}`);
      }
      if (!checklistRes.ok) {
        const body = await checklistRes.json().catch(() => ({}));
        throw new Error(body.error || `Checklist HTTP ${checklistRes.status}`);
      }

      setAllowlist((await allowlistRes.json()) as SafeSandboxAllowlistResponse);
      setInspection(
        (await inspectionRes.json()) as SafeSandboxInspectionResponse,
      );
      setChecklist((await checklistRes.json()) as SafeSandboxChecklistResponse);
    } catch (err) {
      setAllowlist(null);
      setInspection(null);
      setChecklist(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCockpit();
  }, [loadCockpit]);

  const view = inspection?.inspection;

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 px-4 py-3 text-center">
          <p className={`text-sm font-semibold uppercase tracking-[0.2em] text-[#F0BFBF] ${headingFont}`}>
            US SANDBOX — NOT PRODUCTION
          </p>
          <p className="mt-1 text-sm text-[#A29E93]">
            Read-only governed JE custody cockpit. POST and VERIFY are disabled.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#A29E93]">Super-admin session</p>
            <h1 className={`mt-1 text-3xl font-semibold text-[#ECEBE7] ${headingFont}`}>
              Sandbox JE Cockpit
            </h1>
            <p className="mt-2 text-sm text-[#7A7974]">{superAdminEmail}</p>
          </div>
          <Link
            href="/admin"
            className={`rounded-lg border border-[#C9A961]/25 px-4 py-2 text-sm text-[#ECEBE7] transition hover:border-[#C9A961]/40 ${focusRing()}`}
          >
            Back to admin
          </Link>
        </div>

        {loading ? (
          <p className="text-[#A29E93]">Loading read-only custody…</p>
        ) : null}

        {error ? (
          <section
            aria-live="polite"
            className="mb-8 rounded-xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 p-5"
          >
            <h2 className={`text-lg font-semibold text-[#F0BFBF] ${headingFont}`}>
              Cockpit unavailable (fail closed)
            </h2>
            <p className="mt-2 text-sm text-[#F0BFBF]">{error}</p>
            <p className="mt-3 text-sm text-[#A29E93]">
              Requires super-admin access, QB_ENVIRONMENT=sandbox, and canonical Demo A custody.
            </p>
          </section>
        ) : null}

        {!error && allowlist && inspection && checklist ? (
          <div className="space-y-8">
            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Capability state
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <CapabilityBadge label="CREATE" enabled={allowlist.capabilities.create_sandbox_je} />
                <CapabilityBadge label="VERIFY" enabled={allowlist.capabilities.verify_sandbox_je} />
                <CapabilityBadge label="Memory" enabled={allowlist.capabilities.memory} />
                <CapabilityBadge label="worker" enabled={allowlist.capabilities.worker} />
                <CapabilityBadge label="GOVERNED_AUTO" enabled={allowlist.capabilities.governed_auto} />
                <CapabilityBadge label="kill switch" enabled={allowlist.capabilities.kill_switch} inverted />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-wide text-[#F0BFBF]">
                <span>POST DISABLED</span>
                <span>VERIFY DISABLED</span>
              </div>
              <p className="mt-3 text-sm text-[#7A7974]">
                Memory is display context only — never authority for provider success.
              </p>
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Canonical identity lock (Demo A)
              </h2>
              <dl className="mt-4">
                <IdentityRow label="companyId" value={identity.companyId} />
                <IdentityRow label="accountingConnectionId" value={identity.accountingConnectionId} />
                <IdentityRow label="realmId" value={identity.realmId} />
                <IdentityRow label="provider" value={identity.provider} />
                <IdentityRow label="provider_environment" value={identity.providerEnvironment} />
                <IdentityRow label="role" value={identity.demoRole} />
                <IdentityRow label="firmClientId" value={identity.firmClientId} />
              </dl>
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Verified execution custody
              </h2>
              <dl className="mt-4">
                <IdentityRow label="executionId" value={SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID} />
                <IdentityRow label="status" value={view?.execution_status ?? "—"} />
                <IdentityRow label="provider journal ID" value={view?.qbo_je_id ?? SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID} />
                <IdentityRow label="correlation marker" value={view?.correlation_marker ?? "—"} />
                <IdentityRow label="verified at" value={formatDate(inspection.verified_at)} />
                <IdentityRow label="txn date" value={view?.txn_date ?? "—"} />
                <IdentityRow label="currency" value={view?.currency ?? "—"} />
                <IdentityRow label="provider attempt" value={view?.provider_attempt_id ?? "—"} />
                <IdentityRow label="attempt status" value={view?.attempt_status ?? "—"} />
                <IdentityRow label="commit certainty" value={view?.commit_certainty ?? "—"} />
              </dl>
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Economics and hashes
              </h2>
              <dl className="mt-4">
                <IdentityRow label="total debits" value={formatCents(view?.total_debits_cents ?? 0)} />
                <IdentityRow label="total credits" value={formatCents(view?.total_credits_cents ?? 0)} />
                <IdentityRow label="proposal hash" value={view?.proposal_hash ?? "—"} />
                <IdentityRow label="execution hash" value={view?.execution_hash ?? "—"} />
                <IdentityRow label="provider request hash" value={view?.provider_request_hash ?? "—"} />
                <IdentityRow label="provider response hash" value={view?.provider_response_hash ?? "—"} />
                <IdentityRow label="provider readback hash" value={view?.provider_readback_hash ?? "—"} />
              </dl>
              {view?.je_lines?.length ? (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[#A29E93]">
                      <tr>
                        <th className="pb-2 pr-4">Account</th>
                        <th className="pb-2 pr-4">Debit</th>
                        <th className="pb-2">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.je_lines.map((line) => (
                        <tr key={line.account_id} className="border-t border-[#C9A961]/15">
                          <td className="py-2 pr-4 font-mono text-xs">
                            {line.account_name || line.account_id}
                          </td>
                          <td className="py-2 pr-4">{formatCents(line.debit_cents)}</td>
                          <td className="py-2">{formatCents(line.credit_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Patent #6 chain receipt
              </h2>
              <p className="mt-2 text-sm text-[#A29E93]">
                Aggregate {inspection.patent6_chain_receipt.aggregate_type} /{" "}
                {inspection.patent6_chain_receipt.aggregate_id}
              </p>
              <div className="mt-4 space-y-4">
                {inspection.patent6_chain_receipt.events.map((event) => (
                  <article
                    key={event.event_id}
                    className="rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/60 p-4"
                  >
                    <p className="font-mono text-xs text-[#ECEBE7]">{event.event_type}</p>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-[#A29E93]">event_id: </span>
                        <span className="font-mono">{event.event_id}</span>
                      </div>
                      <div>
                        <span className="text-[#A29E93]">chain_index: </span>
                        <span>{event.chain_index ?? "—"}</span>
                      </div>
                      <div className="break-all">
                        <span className="text-[#A29E93]">event_hash: </span>
                        <span className="font-mono">{event.event_hash ?? "—"}</span>
                      </div>
                      <div className="break-all">
                        <span className="text-[#A29E93]">previous_event_hash: </span>
                        <span className="font-mono">{event.previous_event_hash ?? "—"}</span>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Pre-dispatch checklist (read-only)
              </h2>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(checklist.checklist).map(([key, value]) => (
                  <div key={key} className="rounded border border-[#C9A961]/15 px-3 py-2">
                    <dt className="text-[#A29E93]">{key}</dt>
                    <dd className="font-mono text-[#ECEBE7]">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        ) : null}
      </div>
      <SiteFooter />
    </main>
  );
}
