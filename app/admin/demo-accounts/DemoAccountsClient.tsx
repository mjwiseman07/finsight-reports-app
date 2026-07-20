// File: app/admin/demo-accounts/DemoAccountsClient.tsx
//
// Client component for the demo picker. All state comes from
// /api/admin/demo-accounts/list; mutations post to bind-holder / assume /
// release.

"use client";

import { useCallback, useEffect, useState } from "react";

interface HolderView {
  slot: number;
  email: string;
  label: string;
  userId: string | null;
  connection: {
    status: "connected" | "no_connection" | "stale";
    realmId: string | null;
    entityName: string | null;
    updatedAt: string | null;
  };
}

interface DemoFirmView {
  firmId: string;
  firmName: string;
  tierKey: string;
  firmClientId: string;
  currentOwnerUserId: string | null;
  currentOwnerSlot: number | null;
  holders: HolderView[];
}

interface ListResponse {
  firms: DemoFirmView[];
}

export default function DemoAccountsClient({
  superAdminEmail,
}: {
  superAdminEmail: string;
}) {
  const [firms, setFirms] = useState<DemoFirmView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [assumedFirmId, setAssumedFirmId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/demo-accounts/list", {
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const body = (await res.json()) as ListResponse;
      setFirms(body.firms);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bind = useCallback(
    async (firmClientId: string, holderUserId: string) => {
      setBusy(`bind:${holderUserId}`);
      setError(null);
      try {
        const res = await fetch("/api/admin/demo-accounts/bind-holder", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ firmClientId, holderUserId }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const assume = useCallback(async (firmId: string) => {
    setBusy(`assume:${firmId}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/demo-accounts/assume", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firmId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setAssumedFirmId(firmId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const release = useCallback(async () => {
    setBusy("release");
    setError(null);
    try {
      const res = await fetch("/api/admin/demo-accounts/release", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setAssumedFirmId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Advisacor Demo Accounts</h1>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>
          Signed in as <strong>{superAdminEmail}</strong>
          {assumedFirmId && (
            <>
              {" · "}
              <span
                style={{
                  background: "#0f766e",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  marginLeft: 6,
                }}
              >
                Impersonating firm {assumedFirmId}
              </span>
              <button
                type="button"
                onClick={() => void release()}
                disabled={busy !== null}
                style={{ marginLeft: 8 }}
              >
                Release
              </button>
            </>
          )}
        </p>
      </header>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        firms.map((firm) => (
          <section
            key={firm.firmId}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 20,
              marginBottom: 20,
              background: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{firm.firmName}</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                  Tier: <code>{firm.tierKey}</code> · firm_id: <code>{firm.firmId}</code>
                </p>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                  Currently bound: {firm.currentOwnerSlot != null ? `Slot ${firm.currentOwnerSlot}` : "none"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void assume(firm.firmId)}
                disabled={busy !== null || assumedFirmId === firm.firmId}
                style={{
                  background: assumedFirmId === firm.firmId ? "#94a3b8" : "#0f766e",
                  color: "white",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 6,
                  cursor: busy !== null ? "not-allowed" : "pointer",
                }}
              >
                {assumedFirmId === firm.firmId ? "Assumed" : "Assume this firm"}
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: 8 }}>Slot</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Holder</th>
                  <th style={{ textAlign: "left", padding: 8 }}>QBO connection</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Realm</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {firm.holders.map((h) => {
                  const isActive =
                    h.userId != null && h.userId === firm.currentOwnerUserId;
                  const canBind = h.userId != null && h.connection.status === "connected";
                  return (
                    <tr key={h.slot} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 8, fontWeight: isActive ? 600 : 400 }}>
                        Slot {h.slot}
                        {isActive && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              background: "#0f766e",
                              color: "white",
                              padding: "1px 6px",
                              borderRadius: 3,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        <code>{h.email}</code>
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {h.connection.status === "connected"
                          ? "Connected"
                          : h.connection.status === "stale"
                            ? "Stale"
                            : "No connection — connect via DEMO-3B"}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {h.connection.realmId ?? "—"}
                      </td>
                      <td style={{ padding: 8 }}>
                        <button
                          type="button"
                          onClick={() =>
                            h.userId && void bind(firm.firmClientId, h.userId)
                          }
                          disabled={!canBind || busy !== null || isActive}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "1px solid #cbd5e1",
                            background: canBind && !isActive ? "white" : "#f1f5f9",
                            cursor:
                              canBind && !isActive && busy === null
                                ? "pointer"
                                : "not-allowed",
                          }}
                        >
                          {isActive ? "Bound" : "Bind"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  );
}
