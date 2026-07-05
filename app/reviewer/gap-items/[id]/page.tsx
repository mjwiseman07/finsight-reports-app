"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { GapReviewItemRow } from "@/lib/pre-close/assertions-coverage-types";
import { rootCauseCodeToHuman } from "@/lib/pre-close/assertions-coverage-types";
import type { GapResolutionType } from "@/lib/pre-close/assertions-coverage-types";

const AccentTeal = "#01696F";

interface AssertionDetail {
  assertion_id: string;
  display_name: string;
  description: string;
}

function severityClass(severity: string) {
  if (severity === "critical") return "bg-red-500/20 text-red-200";
  if (severity === "warning") return "bg-amber-500/20 text-amber-100";
  return "bg-slate-500/20 text-slate-200";
}

type ModalType = GapResolutionType | null;

export default function GapItemDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [item, setItem] = useState<GapReviewItemRow | null>(null);
  const [assertion, setAssertion] = useState<AssertionDetail | null>(null);
  const [error, setError] = useState("");
  const [isWriter, setIsWriter] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);

  const [manualTestRef, setManualTestRef] = useState("");
  const [rationale, setRationale] = useState("");
  const [activatedRuleId, setActivatedRuleId] = useState("");
  const [deferReason, setDeferReason] = useState("");
  const [linkedTests, setLinkedTests] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(async () => {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const [detailRes, meRes] = await Promise.all([
      fetch(`/api/reviewer/gap-items/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/reviewer/me", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const data = await detailRes.json();
    if (!detailRes.ok) {
      setError(data.error || "not_found");
      return;
    }
    setItem(data.item);
    setAssertion(data.assertion ?? null);
    const me = await meRes.json();
    setIsWriter((me.writerFirmIds ?? []).length > 0);
    const mtRes = await fetch(
      `/api/reviewer/manual-tests?closePeriodId=${encodeURIComponent(data.item.closePeriodId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (mtRes.ok) {
      const mtBody = await mtRes.json();
      setLinkedTests(
        (mtBody.evidence ?? []).filter(
          (e: Record<string, unknown>) => e.resolves_gap_item_id === id,
        ),
      );
    } else {
      setLinkedTests([]);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(type: GapResolutionType) {
    setSubmitting(true);
    const token = window.localStorage.getItem("supabase_access_token") || "";
    let resolutionMetadata: Record<string, unknown> = {};
    if (type === "manual_test") {
      resolutionMetadata = { manual_test_ref: manualTestRef, rationale };
    } else if (type === "rule_activation") {
      resolutionMetadata = { activated_rule_id: activatedRuleId };
    } else if (type === "not_applicable_override") {
      resolutionMetadata = { rationale };
    } else if (type === "deferred_to_next_period") {
      resolutionMetadata = { defer_reason: deferReason };
    }
    const res = await fetch(`/api/reviewer/gap-items/${id}/resolve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resolutionType: type, resolutionMetadata }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "resolve_failed");
      return;
    }
    setModal(null);
    await load();
  }

  if (error) return <p className="text-red-300">{error}</p>;
  if (!item) return <p className="text-slate-400">Loading…</p>;

  const isOpen = item.resolutionStatus === "open";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: AccentTeal }}>
          {item.accountCategory} · {assertion?.display_name ?? item.assertionId}
        </h1>
        <span className={`px-2 py-0.5 rounded text-xs ${severityClass(item.severity)}`}>
          {item.severity}
        </span>
        <p className="text-slate-400 text-sm mt-1">
          Status: {item.resolutionStatus}
          {item.resolutionType ? ` (${item.resolutionType})` : ""}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Root cause</h2>
        <p className="text-sm">{rootCauseCodeToHuman(item.gapRootCauseCode)}</p>
        <p className="text-xs text-slate-400 mt-1">{item.gapRootCauseCode}</p>
      </section>

      {item.gapRecommendation ? (
        <section>
          <h2 className="text-sm font-medium text-teal-300 mb-2">Recommendation</h2>
          <p className="text-sm">{item.gapRecommendation}</p>
        </section>
      ) : null}

      {assertion?.description ? (
        <section>
          <h2 className="text-sm font-medium text-teal-300 mb-2">Assertion definition</h2>
          <p className="text-sm text-slate-300">{assertion.description}</p>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-medium text-teal-300 mb-2">Linked manual tests</h2>
        {linkedTests.length === 0 ? (
          <p className="text-xs text-slate-400">None linked yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {linkedTests.map((t) => (
              <li key={String(t.id)}>
                <Link href={`/reviewer/manual-tests/${String(t.id)}`} className="underline">
                  {String(t.evidence_type)} — {String(t.evidence_summary).slice(0, 80)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOpen && isWriter ? (
        <section>
          <h2 className="text-sm font-medium text-teal-300 mb-2">Resolve</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/reviewer/manual-tests/new?gapItemId=${id}&accountCategory=${item.accountCategory}&assertionId=${item.assertionId}&closePeriodId=${item.closePeriodId}&firmClientId=${item.firmClientId}&engagementId=${item.engagementId}`}
              className="px-3 py-1 bg-white/10 rounded text-sm inline-block"
            >
              Upload manual test
            </Link>
            <button
              type="button"
              className="px-3 py-1 bg-white/10 rounded text-sm"
              onClick={() => setModal("manual_test")}
            >
              Link existing ref
            </button>
            <button
              type="button"
              className="px-3 py-1 bg-white/10 rounded text-sm"
              onClick={() => setModal("rule_activation")}
            >
              Rule activation
            </button>
            <button
              type="button"
              className="px-3 py-1 bg-white/10 rounded text-sm"
              onClick={() => setModal("not_applicable_override")}
            >
              N/A override
            </button>
            <button
              type="button"
              className="px-3 py-1 bg-white/10 rounded text-sm"
              onClick={() => setModal("deferred_to_next_period")}
            >
              Defer to next period
            </button>
          </div>
        </section>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded p-6 max-w-md w-full space-y-4">
            <h3 className="font-medium text-teal-200">Resolve: {modal.replace(/_/g, " ")}</h3>
            {modal === "manual_test" ? (
              <>
                <input
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                  placeholder="Manual test ref"
                  value={manualTestRef}
                  onChange={(e) => setManualTestRef(e.target.value)}
                />
                <textarea
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                  placeholder="Rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              </>
            ) : null}
            {modal === "rule_activation" ? (
              <input
                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                placeholder="Activated rule ID"
                value={activatedRuleId}
                onChange={(e) => setActivatedRuleId(e.target.value)}
              />
            ) : null}
            {modal === "not_applicable_override" ? (
              <textarea
                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                placeholder="Rationale"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
              />
            ) : null}
            {modal === "deferred_to_next_period" ? (
              <textarea
                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                placeholder="Defer reason"
                value={deferReason}
                onChange={(e) => setDeferReason(e.target.value)}
              />
            ) : null}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-1 text-sm"
                onClick={() => setModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-teal-800 rounded text-sm"
                onClick={() => resolve(modal)}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
