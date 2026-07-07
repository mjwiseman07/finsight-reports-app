"use client";

import { useState } from "react";

export default function BaselineHarvestPage() {
  const [firmClientId, setFirmClientId] = useState("");
  const [source, setSource] = useState<"qbo" | "csv">("qbo");
  const [status, setStatus] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  async function startHarvest() {
    setStatus("Starting…");

    const res = await fetch("/api/onboarding/baseline-harvest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firmClientId, source }),
    });

    const body = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${body?.message ?? res.statusText}`);
      return;
    }

    setRunId(body.runId);
    setStatus(
      `Run ${body.runId} started. Poll /api/onboarding/baseline-harvest/${body.runId} for progress.`,
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Baseline Harvest</h1>
      <p className="text-sm text-gray-600 mb-4">
        Import your existing vendors, purchase orders, bills, and goods receipts from QuickBooks
        Online or CSV so three-way match starts working on Day 1.
      </p>
      <label className="block mb-3">
        <span className="text-sm">Firm Client ID</span>
        <input
          className="w-full border rounded px-2 py-1"
          value={firmClientId}
          onChange={(e) => setFirmClientId(e.target.value)}
        />
      </label>
      <label className="block mb-3">
        <span className="text-sm">Source</span>
        <select
          className="w-full border rounded px-2 py-1"
          value={source}
          onChange={(e) => setSource(e.target.value as "qbo" | "csv")}
        >
          <option value="qbo">QuickBooks Online</option>
          <option value="csv">CSV Upload</option>
        </select>
      </label>
      <button
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm"
        onClick={startHarvest}
        disabled={!firmClientId}
      >
        Start Harvest
      </button>
      {source === "csv" && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">CSV Templates</h2>
          <ul className="list-disc pl-6 text-sm">
            <li>
              <a className="text-blue-600" href="/api/onboarding/csv-templates/vendors">
                vendors template
              </a>
            </li>
            <li>
              <a className="text-blue-600" href="/api/onboarding/csv-templates/purchase_orders">
                purchase_orders template
              </a>
            </li>
            <li>
              <a className="text-blue-600" href="/api/onboarding/csv-templates/bills">
                bills template
              </a>
            </li>
            <li>
              <a className="text-blue-600" href="/api/onboarding/csv-templates/goods_receipts">
                goods_receipts template
              </a>
            </li>
          </ul>
        </section>
      )}
      {status && <p className="mt-4 text-sm">{status}</p>}
      {runId && <p className="mt-2 text-xs text-gray-500">run_id: {runId}</p>}
    </main>
  );
}
