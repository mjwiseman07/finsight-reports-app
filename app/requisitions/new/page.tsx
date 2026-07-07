"use client";

import { useState } from "react";
import { LineItemEditor, type LineItem } from "@/components/requisitions/LineItemEditor";

export default function NewRequisitionPage() {
  const [firmClientId, setFirmClientId] = useState("");
  const [vendorHintText, setVendorHintText] = useState("");
  const [justification, setJustification] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price_cents: 0 },
  ]);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Submitting…");

    const res = await fetch("/api/requisitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firmClientId,
        vendorHintText,
        justification,
        neededBy: neededBy || null,
        lines,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${body?.message ?? res.statusText}`);
      return;
    }

    setStatus(`Created ${body.requisition_number}`);
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">New Requisition</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm">Firm Client ID</span>
          <input
            className="w-full border rounded px-2 py-1"
            value={firmClientId}
            onChange={(e) => setFirmClientId(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm">Vendor hint (name)</span>
          <input
            className="w-full border rounded px-2 py-1"
            value={vendorHintText}
            onChange={(e) => setVendorHintText(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Needed by</span>
          <input
            type="date"
            className="w-full border rounded px-2 py-1"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Justification</span>
          <textarea
            className="w-full border rounded px-2 py-1"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </label>
        <div>
          <h2 className="font-semibold mt-4 mb-2">Line Items</h2>
          <LineItemEditor lines={lines} onChange={setLines} />
        </div>
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm">
          Create Requisition
        </button>
        {status && <p className="text-sm mt-2">{status}</p>}
      </form>
    </main>
  );
}
