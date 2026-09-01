"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing, primaryCtaClass } from "@/components/site-ui";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
  SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
  type SafeSandboxAllowlistResponse,
  type SafeSandboxChecklistResponse,
  type SafeSandboxInspectionResponse,
} from "@/lib/journal-entry-governance/sandbox-je-cockpit-shared";
import {
  SANDBOX_JE_LOCKED_AMOUNT_CENTS,
  SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
  SANDBOX_JE_LOCKED_CURRENCY,
  SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID,
  SANDBOX_JE_LOCKED_ORIGIN,
  isStrictProposalUuid,
  type SafeSandboxProposalResponse,
} from "@/lib/journal-entry-governance/sandbox-je-proposal-shared";

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

function newClientMutationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cmid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
}: {
  label: string;
  enabled: boolean;
}) {
  const off = !enabled;
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

function DispatchKillSwitchBadge({ engaged }: { engaged: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        engaged
          ? "border-[#B85C5C]/40 bg-[#B85C5C]/15 text-[#F0BFBF]"
          : "border-[#6DAA45]/40 bg-[#6DAA45]/15 text-[#B5E28A]"
      }`}
    >
      Kill switch: {engaged ? "ON (dispatch blocked)" : "OFF (dispatch permitted)"}
    </span>
  );
}

export default function SandboxJeCockpitClient({
  sessionEmail,
  sessionUserId,
  isSuperAdmin,
  isDesignatedApprover,
}: {
  sessionEmail: string;
  sessionUserId: string;
  isSuperAdmin: boolean;
  isDesignatedApprover: boolean;
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

  const [memo, setMemo] = useState(
    "Sandbox JE cockpit governed accrual (custody only; no provider dispatch)",
  );
  const [txnDate, setTxnDate] = useState("");
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<SafeSandboxProposalResponse | null>(
    null,
  );
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionOk, setDecisionOk] = useState<string | null>(null);

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

  const refreshProposal = useCallback(async (proposalId: string) => {
    const res = await fetch(
      `/api/governed/journal-entries/sandbox/proposals/${proposalId}`,
      { credentials: "include" },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Proposal HTTP ${res.status}`);
    }
    setProposal((await res.json()) as SafeSandboxProposalResponse);
  }, []);

  useEffect(() => {
    void loadCockpit();
  }, [loadCockpit]);

  useEffect(() => {
    if (loading) return;
    const proposalId = new URLSearchParams(window.location.search)
      .get("proposalId")
      ?.trim();
    if (!proposalId) return;
    if (!isStrictProposalUuid(proposalId)) {
      setProposalError("Invalid proposalId in URL.");
      return;
    }
    void refreshProposal(proposalId).catch((err) => {
      setProposalError((err as Error).message);
    });
  }, [loading, refreshProposal]);

  const submitProposal = useCallback(async () => {
    setProposalBusy(true);
    setProposalError(null);
    setDecisionOk(null);
    try {
      const res = await fetch(
        "/api/governed/journal-entries/sandbox/proposals",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memo,
            txnDate: txnDate || undefined,
            clientMutationId: newClientMutationId(),
          }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Propose HTTP ${res.status}`);
      }
      setProposal(body as SafeSandboxProposalResponse);
    } catch (err) {
      setProposalError((err as Error).message);
    } finally {
      setProposalBusy(false);
    }
  }, [memo, txnDate]);

  const submitDecision = useCallback(
    async (decision: "APPROVED" | "REJECTED") => {
      if (!proposal?.proposal_id) return;
      setDecisionBusy(true);
      setDecisionError(null);
      setDecisionOk(null);
      try {
        const res = await fetch(
          `/api/governed/journal-entries/sandbox/proposals/${proposal.proposal_id}/decision`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decision,
              reason: decisionReason || undefined,
              clientMutationId: newClientMutationId(),
            }),
          },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Decision HTTP ${res.status}`);
        }
        setDecisionOk(`${decision} recorded (custody only).`);
        await refreshProposal(proposal.proposal_id);
      } catch (err) {
        setDecisionError((err as Error).message);
      } finally {
        setDecisionBusy(false);
      }
    },
    [decisionReason, proposal?.proposal_id, refreshProposal],
  );

  const view = inspection?.inspection;
  const canShowApprovalPanel =
    isDesignatedApprover &&
    proposal &&
    proposal.proposed_by !== sessionUserId &&
    proposal.approvals.length === 0;

  return (
    <main className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 px-4 py-3 text-center">
          <p
            className={`text-sm font-semibold uppercase tracking-[0.2em] text-[#F0BFBF] ${headingFont}`}
          >
            US SANDBOX — NOT PRODUCTION
          </p>
          <p className="mt-1 text-sm text-[#A29E93]">
            CREATE OFF · VERIFY OFF · dispatch kill switch ON · provider POST
            impossible. Proposal/approval writes Patent #6 DB custody only.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#A29E93]">
              {isSuperAdmin ? "Super-admin session" : "Designated approver session"}
            </p>
            <h1
              className={`mt-1 text-3xl font-semibold text-[#ECEBE7] ${headingFont}`}
            >
              Sandbox JE Cockpit
            </h1>
            <p className="mt-2 text-sm text-[#7A7974]">{sessionEmail}</p>
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
          </section>
        ) : null}

        {!error && allowlist && inspection && checklist ? (
          <div className="space-y-8">
            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Capability state
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <CapabilityBadge
                  label="CREATE"
                  enabled={allowlist.capabilities.create_sandbox_je}
                />
                <CapabilityBadge
                  label="VERIFY"
                  enabled={allowlist.capabilities.verify_sandbox_je}
                />
                <CapabilityBadge
                  label="Memory"
                  enabled={allowlist.capabilities.memory}
                />
                <CapabilityBadge
                  label="worker"
                  enabled={allowlist.capabilities.worker}
                />
                <CapabilityBadge
                  label="GOVERNED_AUTO"
                  enabled={allowlist.capabilities.governed_auto}
                />
                <DispatchKillSwitchBadge
                  engaged={allowlist.capabilities.dispatch_kill_switch_engaged}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-wide text-[#F0BFBF]">
                <span>POST DISABLED</span>
                <span>VERIFY DISABLED</span>
                <span>EXECUTION PREPARE DISABLED</span>
              </div>
              <p className="mt-3 text-sm text-[#7A7974]">
                Memory is display context only — never authority for provider
                success.
              </p>
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Canonical identity lock (Demo A)
              </h2>
              <dl className="mt-4">
                <IdentityRow label="companyId" value={identity.companyId} />
                <IdentityRow
                  label="accountingConnectionId"
                  value={identity.accountingConnectionId}
                />
                <IdentityRow label="realmId" value={identity.realmId} />
                <IdentityRow label="provider" value={identity.provider} />
                <IdentityRow
                  label="provider_environment"
                  value={identity.providerEnvironment}
                />
                <IdentityRow label="role" value={identity.demoRole} />
                <IdentityRow label="firmClientId" value={identity.firmClientId} />
              </dl>
            </section>

            {isSuperAdmin ? (
              <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
                <h2
                  className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}
                >
                  Start governed proposal
                </h2>
                <p className="mt-2 text-sm text-[#A29E93]">
                  Submission writes governed proposal custody and Patent #6{" "}
                  <span className="font-mono">journal_entry.proposed</span> only.
                  No execution reservation, provider attempt, QBO call, or Memory
                  write.
                </p>
                <dl className="mt-4">
                  <IdentityRow
                    label="debit account (locked)"
                    value={SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID}
                  />
                  <IdentityRow
                    label="credit account (locked)"
                    value={SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID}
                  />
                  <IdentityRow
                    label="amount (locked)"
                    value={formatCents(SANDBOX_JE_LOCKED_AMOUNT_CENTS)}
                  />
                  <IdentityRow
                    label="currency (locked)"
                    value={SANDBOX_JE_LOCKED_CURRENCY}
                  />
                  <IdentityRow
                    label="origin (locked)"
                    value={SANDBOX_JE_LOCKED_ORIGIN}
                  />
                </dl>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-[#A29E93]">Transaction date</span>
                    <input
                      type="date"
                      value={txnDate}
                      onChange={(e) => setTxnDate(e.target.value)}
                      className={`mt-1 w-full rounded-lg border border-[#C9A961]/25 bg-[#111112] px-3 py-2 text-[#ECEBE7] ${focusRing()}`}
                    />
                    <span className="mt-1 block text-xs text-[#7A7974]">
                      Leave blank to use authoritative period_end from eligible
                      READY CC custody.
                    </span>
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[#A29E93]">Memo</span>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={3}
                      className={`mt-1 w-full rounded-lg border border-[#C9A961]/25 bg-[#111112] px-3 py-2 text-[#ECEBE7] ${focusRing()}`}
                    />
                  </label>
                </div>
                {proposalError ? (
                  <p className="mt-4 text-sm text-[#F0BFBF]" role="alert">
                    {proposalError}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={proposalBusy}
                  onClick={() => void submitProposal()}
                  className={`mt-6 ${primaryCtaClass} disabled:opacity-50`}
                >
                  {proposalBusy
                    ? "Creating proposal custody…"
                    : "Create governed proposal (DB only)"}
                </button>
              </section>
            ) : null}

            {proposal ? (
              <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
                <h2
                  className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}
                >
                  Proposal detail + Patent #6
                </h2>
                <dl className="mt-4">
                  <IdentityRow label="proposalId" value={proposal.proposal_id} />
                  <IdentityRow label="status" value={proposal.status} />
                  <IdentityRow
                    label="proposal hash"
                    value={proposal.proposal_hash}
                  />
                  <IdentityRow label="proposed by" value={proposal.proposed_by} />
                  <IdentityRow
                    label="proposed at"
                    value={formatDate(proposal.proposed_at)}
                  />
                  <IdentityRow label="txn date" value={proposal.txn_date} />
                  <IdentityRow
                    label="amount"
                    value={formatCents(proposal.amount_cents)}
                  />
                  <IdentityRow
                    label="source CC"
                    value={proposal.source_continuous_close_run_id}
                  />
                  <IdentityRow
                    label="source sync"
                    value={proposal.source_accounting_sync_id}
                  />
                  <IdentityRow
                    label="source recon"
                    value={proposal.source_recon_run_ids.join(", ") || "—"}
                  />
                </dl>
                <div className="mt-6 space-y-4">
                  {proposal.patent6_chain_receipt.events.map((event) => (
                    <article
                      key={event.event_id}
                      className="rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/60 p-4"
                    >
                      <p className="font-mono text-xs text-[#ECEBE7]">
                        {event.event_type}
                      </p>
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
                          <span className="font-mono">
                            {event.event_hash ?? "—"}
                          </span>
                        </div>
                        <div className="break-all">
                          <span className="text-[#A29E93]">
                            previous_event_hash:{" "}
                          </span>
                          <span className="font-mono">
                            {event.previous_event_hash ?? "—"}
                          </span>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
                {proposal.approvals.length ? (
                  <div className="mt-6">
                    <h3
                      className={`text-lg font-semibold text-[#ECEBE7] ${headingFont}`}
                    >
                      Decision history
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {proposal.approvals.map((a) => (
                        <li
                          key={a.approval_id}
                          className="rounded border border-[#C9A961]/20 px-3 py-2"
                        >
                          <span className="font-semibold">{a.decision}</span> ·{" "}
                          {formatDate(a.decided_at)} · MFA {a.mfa_level || "—"}
                          <div className="mt-1 font-mono text-xs text-[#A29E93]">
                            approvalId: {a.approval_id}
                          </div>
                          <div className="font-mono text-xs text-[#A29E93]">
                            reviewer: {a.reviewer_user_id}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {canShowApprovalPanel ? (
              <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
                <h2
                  className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}
                >
                  Approval / rejection
                </h2>
                <p className="mt-2 text-sm text-[#A29E93]">
                  MFA/AAL2 step-up is required for every decision. Decision writes
                  approval custody and Patent #6 approved/rejected events only —
                  no execution prepare and no provider POST.
                </p>
                <label className="mt-4 block text-sm">
                  <span className="text-[#A29E93]">Reason (required for reject)</span>
                  <textarea
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    rows={3}
                    className={`mt-1 w-full rounded-lg border border-[#C9A961]/25 bg-[#111112] px-3 py-2 text-[#ECEBE7] ${focusRing()}`}
                  />
                </label>
                {decisionError ? (
                  <p className="mt-4 text-sm text-[#F0BFBF]" role="alert">
                    {decisionError}
                  </p>
                ) : null}
                {decisionOk ? (
                  <p className="mt-4 text-sm text-[#B5E28A]" role="status">
                    {decisionOk}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={decisionBusy}
                    onClick={() => void submitDecision("APPROVED")}
                    className={`${primaryCtaClass} disabled:opacity-50`}
                  >
                    Approve (DB custody only)
                  </button>
                  <button
                    type="button"
                    disabled={decisionBusy}
                    onClick={() => void submitDecision("REJECTED")}
                    className={`rounded-lg border border-[#B85C5C]/40 bg-[#B85C5C]/15 px-4 py-2 text-sm font-semibold text-[#F0BFBF] disabled:opacity-50 ${focusRing()}`}
                  >
                    Reject
                  </button>
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Verified execution custody (read-only context)
              </h2>
              <dl className="mt-4">
                <IdentityRow
                  label="executionId"
                  value={SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID}
                />
                <IdentityRow
                  label="status"
                  value={view?.execution_status ?? "—"}
                />
                <IdentityRow
                  label="provider journal ID"
                  value={
                    view?.qbo_je_id ??
                    SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID
                  }
                />
                <IdentityRow
                  label="verified at"
                  value={formatDate(inspection.verified_at)}
                />
              </dl>
            </section>

            <section className="rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-6">
              <h2 className={`text-xl font-semibold text-[#ECEBE7] ${headingFont}`}>
                Pre-dispatch checklist (read-only)
              </h2>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(checklist.checklist).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded border border-[#C9A961]/15 px-3 py-2"
                  >
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
