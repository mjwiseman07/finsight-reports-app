"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function ReviewerSettingsPage() {
  const params = useParams();
  const engagementId = String(params?.engagementId ?? "");
  const [preset, setPreset] = useState<string>("advisacor_balanced");
  const [viewQueue, setViewQueue] = useState(false);
  const [viewEvidence, setViewEvidence] = useState(false);
  const [viewJeDraft, setViewJeDraft] = useState(false);
  const [msg, setMsg] = useState("");

  async function savePolicy() {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const res = await fetch(`/api/reviewer/policy/${engagementId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ advisacorPreset: preset }),
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
        <button type="button" onClick={savePolicy} className="mt-2 px-3 py-1 bg-teal-800 rounded">
          Save policy
        </button>
      </section>
      <section>
        <h2 className="text-lg text-teal-200 mb-3">Client visibility</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={viewQueue} onChange={(e) => setViewQueue(e.target.checked)} />
          Client can view queue
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={viewEvidence} onChange={(e) => setViewEvidence(e.target.checked)} />
          Client can view evidence
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={viewJeDraft} onChange={(e) => setViewJeDraft(e.target.checked)} />
          Client can view JE draft
        </label>
        <button type="button" onClick={saveVisibility} className="mt-2 px-3 py-1 bg-teal-800 rounded">
          Save visibility
        </button>
      </section>
      {msg ? <p className="text-sm text-slate-400">{msg}</p> : null}
    </div>
  );
}
