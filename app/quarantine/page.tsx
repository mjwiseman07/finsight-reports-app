/**
 * Phase D6.5 Part 2 — Block 3
 * /quarantine — minimal reviewer surface (App Router).
 */
"use client";
import { useEffect, useState } from "react";
import { FraudScorePanel } from "./fraud-score-panel";

interface QuarantineRow {
  id: string;
  bill_id: string;
  quarantine_reason: string;
  originating_signals: Array<{ code: string; severity: string; evidence: unknown }>;
  opened_at: string;
}

interface DuplicateRow {
  id: string;
  bill_id: string;
  matched_bill_id: string;
  strategy_id: string;
  severity: string;
  confidence: number;
}

export default function QuarantinePage() {
  const [rows, setRows] = useState<QuarantineRow[]>([]);
  const [duplicates, setDuplicates] = useState<Record<string, DuplicateRow[]>>({});
  const [status, setStatus] = useState<string>("loading");
  const [attestation, setAttestation] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/quarantine/list")
      .then((r) => r.json())
      .then(async (data) => {
        const quarantines: QuarantineRow[] = data.quarantines ?? [];
        setRows(quarantines);
        setStatus("ready");
        const dupMap: Record<string, DuplicateRow[]> = {};
        await Promise.all(
          quarantines.map(async (row) => {
            const res = await fetch(`/api/ap-intake/duplicates?bill_id=${row.bill_id}`);
            if (res.ok) {
              const body = await res.json();
              dupMap[row.bill_id] = body.duplicates ?? [];
            }
          }),
        );
        setDuplicates(dupMap);
      })
      .catch(() => setStatus("error"));
  }, []);

  async function submit(billId: string): Promise<void> {
    const text = attestation[billId] ?? "";
    const res = await fetch("/api/quarantine/release-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bill_id: billId, attestation_text: text }),
    });
    const data = await res.json();
    if (data.released) {
      setFeedback({
        ...feedback,
        [billId]: "Released — refresh the page to update the list.",
      });
    } else if (data.blocking_gates) {
      setFeedback({
        ...feedback,
        [billId]: `Release blocked by: ${data.blocking_gates.join(", ")}`,
      });
    } else {
      setFeedback({ ...feedback, [billId]: `Error: ${data.error ?? "unknown"}` });
    }
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Quarantined Bills</h1>
      <p style={{ color: "#555" }}>
        Review each quarantined bill, provide an attestation that references the originating signal
        code, and submit for gate evaluation. All four gates must pass before release.
      </p>
      {status === "loading" && <p>Loading…</p>}
      {status === "error" && <p>Error loading quarantines.</p>}
      {status === "ready" && rows.length === 0 && <p>No open quarantines.</p>}
      {rows.map((row) => (
        <section
          key={row.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "1rem",
            margin: "1rem 0",
          }}
        >
          <h2 style={{ margin: 0 }}>Bill {row.bill_id}</h2>
          <p style={{ margin: "0.25rem 0", color: "#666" }}>
            Reason: <code>{row.quarantine_reason}</code> · Opened:{" "}
            {new Date(row.opened_at).toLocaleString()}
          </p>
          <details>
            <summary>Signals</summary>
            <pre
              style={{
                background: "#f7f6f2",
                padding: "0.5rem",
                borderRadius: 4,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(row.originating_signals, null, 2)}
            </pre>
          </details>
          {(duplicates[row.bill_id]?.length ?? 0) > 0 && (
            <details style={{ marginTop: "0.5rem" }}>
              <summary>
                Duplicate matches ({duplicates[row.bill_id]?.length ?? 0})
              </summary>
              <pre
                style={{
                  background: "#fff8e6",
                  padding: "0.5rem",
                  borderRadius: 4,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(duplicates[row.bill_id], null, 2)}
              </pre>
            </details>
          )}
          <FraudScorePanel billId={row.bill_id} />
          <label htmlFor={`att-${row.id}`} style={{ display: "block", marginTop: "0.75rem" }}>
            Attestation (must reference at least one signal code, ≥20 chars):
          </label>
          <textarea
            id={`att-${row.id}`}
            value={attestation[row.bill_id] ?? ""}
            onChange={(e) =>
              setAttestation({ ...attestation, [row.bill_id]: e.target.value })
            }
            rows={3}
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.5rem",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={() => submit(row.bill_id)}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              background: "#01696F",
              color: "#fff",
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Submit release request
          </button>
          {feedback[row.bill_id] && (
            <p style={{ marginTop: "0.5rem", color: "#28251d" }}>{feedback[row.bill_id]}</p>
          )}
        </section>
      ))}
    </main>
  );
}
