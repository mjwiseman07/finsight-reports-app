"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReviewerSettingsPage() {
  const params = useParams();
  const engagementId = String(params?.engagementId ?? "");
  const [preset, setPreset] = useState<string>("advisacor_balanced");
  const [viewQueue, setViewQueue] = useState(false);
  const [viewEvidence, setViewEvidence] = useState(false);
  const [viewJeDraft, setViewJeDraft] = useState(false);
  const [lowDollars, setLowDollars] = useState("1000");
  const [medDollars, setMedDollars] = useState("10000");
  const [highMfa, setHighMfa] = useState(true);
  const [autonomous, setAutonomous] = useState(false);
  const [maxBucket, setMaxBucket] = useState<"low" | "medium">("low");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!engagementId) return;
    (async () => {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      const res = await fetch(`/api/reviewer/policy/${engagementId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const p = await res.json();
      if (p.advisacorPreset) setPreset(p.advisacorPreset);
      setLowDollars(String((p.materialityLowMaxCents ?? 100_000) / 100));
      setMedDollars(String((p.materialityMediumMaxCents ?? 1_000_000) / 100));
      setHighMfa(p.materialityHighRequiresMfa ?? true);
      setAutonomous(Boolean(p.autonomousPostingEnabled));
      if (p.autonomousMaxBucket === "medium") setMaxBucket("medium");
    })();
  }, [engagementId]);

  async function savePolicy() {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const lowCents = Math.round(Number(lowDollars) * 100);
    const medCents = Math.round(Number(medDollars) * 100);
    const res = await fetch(`/api/reviewer/policy/${engagementId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        advisacorPreset: preset,
        materialityLowMaxCents: Number.isFinite(lowCents) ? lowCents : null,
        materialityMediumMaxCents: Number.isFinite(medCents) ? medCents : null,
        materialityHighRequiresMfa: highMfa,
        autonomousPostingEnabled: autonomous,
        autonomousMaxBucket: autonomous ? maxBucket : null,
      }),
    });
    setMsg(res.ok ? "Policy saved" : "Policy save failed");
  }

  async function saveVisibility() {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const res = await fetch(`/api/reviewer/visibility/${engagementId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientCanViewQueue: viewQueue,
        clientCanViewEvidence: viewEvidence,
        clientCanViewJeDraft: viewJeDraft,
      }),
    });
    setMsg(res.ok ? "Visibility saved" : "Visibility save failed");
  }

  return (
    <div className="max-w-lg space-y-8">
      <section>
        <h2 className="text-lg text-teal-200 mb-3">Posting policy</h2>
        {["advisacor_conservative", "advisacor_balanced", "advisacor_aggressive"].map((p) => (
          <label key={p} className="flex items-center gap-2 text-sm mb-1">
            <input type="radio" checked={preset === p} onChange={() => setPreset(p)} />
            {p}
          </label>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg text-teal-200 mb-1">Materiality &amp; MFA (Gap 3)</h2>
        <label className="block text-sm">
          Low max ($)
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1"
            value={lowDollars}
            onChange={(e) => setLowDollars(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Medium max ($)
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1"
            value={medDollars}
            onChange={(e) => setMedDollars(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={highMfa} onChange={(e) => setHighMfa(e.target.checked)} />
          High materiality requires MFA step-up
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autonomous}
            onChange={(e) => setAutonomous(e.target.checked)}
          />
          Enable autonomous posting
        </label>
        {autonomous ? (
          <div className="ml-4 space-y-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={maxBucket === "low"}
                onChange={() => setMaxBucket("low")}
              />
              Low only
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={maxBucket === "medium"}
                onChange={() => setMaxBucket("medium")}
              />
              Low + Medium
            </label>
          </div>
        ) : null}
        <button type="button" onClick={savePolicy} className="mt-2 px-3 py-1 bg-teal-800 rounded">
          Save policy
        </button>
        <p className="text-xs text-slate-500">
          Firm admin surface also at{" "}
          <Link
            href={`/firm/engagements/${engagementId}/posting-policy`}
            className="underline"
          >
            /firm/engagements/…/posting-policy
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-lg text-teal-200 mb-3">Client visibility</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={viewQueue} onChange={(e) => setViewQueue(e.target.checked)} />
          Client can view queue
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={viewEvidence}
            onChange={(e) => setViewEvidence(e.target.checked)}
          />
          Client can view evidence
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={viewJeDraft}
            onChange={(e) => setViewJeDraft(e.target.checked)}
          />
          Client can view JE draft
        </label>
        <button
          type="button"
          onClick={saveVisibility}
          className="mt-2 px-3 py-1 bg-teal-800 rounded"
        >
          Save visibility
        </button>
      </section>
      {msg ? <p className="text-sm text-slate-400">{msg}</p> : null}
    </div>
  );
}
