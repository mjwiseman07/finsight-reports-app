"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MANUAL_EVIDENCE_TYPES } from "@/lib/pre-close/manual-test-evidence-types";

const AccentTeal = "#01696F";

function NewManualTestPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    firmClientId: params?.get("firmClientId") ?? "",
    engagementId: params?.get("engagementId") ?? "",
    closePeriodId: params?.get("closePeriodId") ?? "",
    accountCategory: params?.get("accountCategory") ?? "cash",
    assertionId: params?.get("assertionId") ?? "accuracy",
    evidenceType: "manual_procedure",
    sourceType: "reviewer_upload",
    evidenceSummary: "",
    calculationNotes: "",
    dataSourceReliabilityBasis: "",
    resolvesGapItemId: params?.get("gapItemId") ?? "",
  });

  async function submit() {
    setSubmitting(true);
    setError("");
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const res = await fetch("/api/reviewer/manual-tests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        resolvesGapItemId: form.resolvesGapItemId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "create_failed");
      setSubmitting(false);
      return;
    }
    const id = data.evidence.id as string;
    setEvidenceId(id);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/reviewer/manual-tests/${id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
    }
    setSubmitting(false);
    router.push(`/reviewer/manual-tests/${id}`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: AccentTeal }}>
        New manual test evidence
      </h1>
      {error ? <p className="text-red-300">{error}</p> : null}
      <div className="grid gap-3 text-sm">
        {(["firmClientId", "engagementId", "closePeriodId", "accountCategory", "assertionId", "sourceType"] as const).map(
          (k) => (
            <label key={k} className="block">
              <span className="text-slate-400">{k}</span>
              <input
                className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 mt-1"
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              />
            </label>
          ),
        )}
        <label className="block">
          <span className="text-slate-400">evidenceType</span>
          <select
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 mt-1"
            value={form.evidenceType}
            onChange={(e) => setForm((f) => ({ ...f, evidenceType: e.target.value }))}
          >
            {MANUAL_EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-slate-400">evidenceSummary</span>
          <textarea
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 mt-1"
            rows={4}
            value={form.evidenceSummary}
            onChange={(e) => setForm((f) => ({ ...f, evidenceSummary: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="text-slate-400">dataSourceReliabilityBasis (AS 1105 .10A)</span>
          <textarea
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 mt-1"
            rows={2}
            value={form.dataSourceReliabilityBasis}
            onChange={(e) => setForm((f) => ({ ...f, dataSourceReliabilityBasis: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="text-slate-400">attachments</span>
          <input
            type="file"
            multiple
            className="mt-1"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
      </div>
      <button
        type="button"
        className="px-4 py-2 bg-teal-800 rounded text-sm"
        onClick={submit}
        disabled={submitting || !!evidenceId}
      >
        {submitting ? "Saving…" : "Create manual test"}
      </button>
      {form.resolvesGapItemId ? (
        <p className="text-xs text-slate-400">
          Linked gap:{" "}
          <Link href={`/reviewer/gap-items/${form.resolvesGapItemId}`} className="underline">
            {form.resolvesGapItemId}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default function NewManualTestPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm">Loading form…</div>}>
      <NewManualTestPageInner />
    </Suspense>
  );
}
