"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Policy = {
  materialityLowMaxCents: number | null;
  materialityMediumMaxCents: number | null;
  materialityHighRequiresMfa: boolean | null;
  autonomousPostingEnabled: boolean;
  autonomousMaxBucket: "low" | "medium" | null;
};

function authHeaders(): HeadersInit {
  const token = window.localStorage.getItem("supabase_access_token") || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function FirmPostingPolicyPage() {
  const params = useParams();
  const engagementId = String(params?.id ?? "");
  const [lowDollars, setLowDollars] = useState("1000");
  const [medDollars, setMedDollars] = useState("10000");
  const [highMfa, setHighMfa] = useState(true);
  const [autonomous, setAutonomous] = useState(false);
  const [maxBucket, setMaxBucket] = useState<"low" | "medium">("low");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!engagementId) return;
    (async () => {
      const res = await fetch(`/api/firm/engagements/${engagementId}/posting-policy`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const p = (await res.json()) as Policy;
      setLowDollars(String((p.materialityLowMaxCents ?? 100_000) / 100));
      setMedDollars(String((p.materialityMediumMaxCents ?? 1_000_000) / 100));
      setHighMfa(p.materialityHighRequiresMfa ?? true);
      setAutonomous(Boolean(p.autonomousPostingEnabled));
      if (p.autonomousMaxBucket === "medium") setMaxBucket("medium");
      else setMaxBucket("low");
    })();
  }, [engagementId]);

  async function save() {
    const lowCents = Math.round(Number(lowDollars) * 100);
    const medCents = Math.round(Number(medDollars) * 100);
    const body = {
      materialityLowMaxCents: Number.isFinite(lowCents) ? lowCents : null,
      materialityMediumMaxCents: Number.isFinite(medCents) ? medCents : null,
      materialityHighRequiresMfa: highMfa,
      autonomousPostingEnabled: autonomous,
      autonomousMaxBucket: autonomous ? maxBucket : null,
    };
    const res = await fetch(`/api/firm/engagements/${engagementId}/posting-policy`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    setMsg(res.ok ? "Saved" : "Save failed");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6 text-slate-100">
      <h1 className="text-xl font-semibold text-teal-200">JE posting policy</h1>
      <p className="text-sm text-slate-400">Engagement {engagementId}</p>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-teal-300">Materiality thresholds ($)</h2>
        <label className="block text-sm">
          Low max
          <input
            className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1"
            value={lowDollars}
            onChange={(e) => setLowDollars(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Medium max
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-teal-300">Autonomous posting</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autonomous}
            onChange={(e) => setAutonomous(e.target.checked)}
          />
          Enable autonomous posting (opt-in)
        </label>
        {autonomous ? (
          <div className="space-y-1 text-sm">
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
            <p className="text-xs text-slate-500">High-bucket autonomous posting is not allowed.</p>
          </div>
        ) : null}
      </section>

      <button type="button" onClick={save} className="rounded bg-teal-800 px-3 py-1.5 text-sm">
        Save
      </button>
      {msg ? <p className="text-sm text-slate-400">{msg}</p> : null}
    </div>
  );
}