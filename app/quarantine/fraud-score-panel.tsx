"use client";

import { useEffect, useState } from "react";

interface FraudSignalRow {
  id: string;
  layer: string;
  signal_code: string;
  severity: string;
  contribution: number;
  evidence: Record<string, unknown>;
  disposition: string;
}

interface FraudScorePanelProps {
  billId: string;
}

function scoreBadgeStyle(score: number): { background: string; color: string } {
  if (score >= 0.9) return { background: "#A12C7B", color: "#FFF" };
  if (score >= 0.6) return { background: "#964219", color: "#FFF" };
  return { background: "#7A7974", color: "#FFF" };
}

export function FraudScorePanel({ billId }: FraudScorePanelProps): React.ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aggregatedScore, setAggregatedScore] = useState<number | null>(null);
  const [signals, setSignals] = useState<FraudSignalRow[]>([]);
  const [drawerEvidence, setDrawerEvidence] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`/api/fraud-signals/list?bill_id=${billId}`)
      .then((r) => r.json())
      .then((data) => {
        setAggregatedScore(
          typeof data.aggregated_score === "number" ? data.aggregated_score : null,
        );
        if (expanded) {
          setSignals(data.signals ?? []);
          setLoaded(true);
        }
      })
      .catch(() => undefined);
  }, [billId, expanded]);

  useEffect(() => {
    if (!expanded || loaded) return;
    fetch(`/api/fraud-signals/list?bill_id=${billId}`)
      .then((r) => r.json())
      .then((data) => {
        setSignals(data.signals ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [expanded, loaded, billId]);

  async function dispose(signalId: string, disposition: string): Promise<void> {
    await fetch("/api/fraud-signals/dispose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: signalId, disposition }),
    });
    setSignals((prev) =>
      prev.map((s) => (s.id === signalId ? { ...s, disposition } : s)),
    );
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {aggregatedScore != null && (
        <span
          style={{
            display: "inline-block",
            padding: "0.25rem 0.5rem",
            borderRadius: 4,
            fontSize: "0.875rem",
            fontWeight: 600,
            ...scoreBadgeStyle(aggregatedScore),
          }}
        >
          Fraud score: {Number(aggregatedScore).toFixed(2)}
        </span>
      )}
      <details
        style={{ marginTop: "0.5rem" }}
        onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
      >
        <summary>Contributing fraud signals</summary>
        {!loaded && <p style={{ fontSize: "0.875rem", color: "#666" }}>Loading…</p>}
        {loaded && signals.length === 0 && (
          <p style={{ fontSize: "0.875rem", color: "#666" }}>No scored signals.</p>
        )}
        {signals.length > 0 && (
          <table
            style={{
              width: "100%",
              marginTop: "0.5rem",
              fontSize: "0.8rem",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Layer</th>
                <th>Signal</th>
                <th>Severity</th>
                <th>Contrib.</th>
                <th>Evidence</th>
                <th>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{s.layer}</td>
                  <td>{s.signal_code}</td>
                  <td>{s.severity}</td>
                  <td>{s.contribution}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setDrawerEvidence(s.evidence)}
                      style={{ fontSize: "0.75rem" }}
                    >
                      View
                    </button>
                  </td>
                  <td>
                    <select
                      value={s.disposition}
                      onChange={(e) => dispose(s.id, e.target.value)}
                      style={{ fontSize: "0.75rem" }}
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="dismissed">dismissed</option>
                      <option value="escalated">escalated</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
      {drawerEvidence && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: 360,
            height: "100%",
            background: "#fff",
            borderLeft: "1px solid #ddd",
            padding: "1rem",
            overflowY: "auto",
            zIndex: 50,
            boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
          }}
        >
          <button type="button" onClick={() => setDrawerEvidence(null)}>
            Close
          </button>
          <pre style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
            {JSON.stringify(drawerEvidence, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
