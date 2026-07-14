"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClientBriefingsChrome, EmptyBriefingState } from "../../../components/ClientBriefingsChrome";

type DashboardRow = {
  clientId: string;
  clientName: string;
  settings?: BriefingSettings;
};

type BriefingSettings = {
  clientId: string;
  cadence: string;
  dayOfWeek: string;
  deliveryTime: string;
  timezone: string;
  deliveryMethod: string;
  approvalRequired: boolean;
  isActive: boolean;
};

const defaultSettings: BriefingSettings = {
  clientId: "",
  cadence: "weekly",
  dayOfWeek: "Friday",
  deliveryTime: "08:00",
  timezone: "America/New_York",
  deliveryMethod: "both",
  approvalRequired: true,
  isActive: true,
};

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("supabase_access_token") || "";
}

function ClientBriefingSettingsContent() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<DashboardRow[]>([]);
  const [form, setForm] = useState<BriefingSettings>(defaultSettings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      const token = getAuthToken();
      if (!token) {
        setError("Sign in as a firm admin or advisor to configure Client Briefings.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/client-briefings/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error || "Unable to load briefing settings.");
          return;
        }

        const rows = result.rows || [];
        const requestedClientId = searchParams?.get("client_id") || "";
        const selectedRow = rows.find((row: DashboardRow) => row.clientId === requestedClientId) || rows[0];
        setClients(rows);
        if (selectedRow) setForm({ ...defaultSettings, ...selectedRow.settings, clientId: selectedRow.clientId });
      } catch {
        setError("Unable to load briefing settings.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadClients();
  }, [searchParams]);

  const selectedClient = useMemo(() => clients.find((client) => client.clientId === form.clientId), [clients, form.clientId]);

  const update = (key: keyof BriefingSettings, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleClientChange = (clientId: string) => {
    const row = clients.find((client) => client.clientId === clientId);
    setForm({ ...defaultSettings, ...row?.settings, clientId });
  };

  const saveSettings = async () => {
    const token = getAuthToken();
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/client-briefings/settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: form.clientId,
          cadence: form.cadence,
          day_of_week: form.dayOfWeek,
          delivery_time: form.deliveryTime,
          timezone: form.timezone,
          delivery_method: form.deliveryMethod,
          approval_required: form.approvalRequired,
          is_active: form.isActive,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to save settings.");
        return;
      }
      setMessage("Client Briefing settings saved.");
    } catch {
      setError("Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ClientBriefingsChrome active="Settings">
      <section className="py-10">
        <div className="rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C] p-8 shadow-2xl shadow-black/40">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Briefing Cadence Setup</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] text-[#ECEBE7]">Choose how each client receives CFO-style updates.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#A29E93]">
            Set weekly, bi-weekly, monthly, quarterly, or custom delivery for each client, including advisor approval and delivery channel.
          </p>
        </div>

        {isLoading && <div className="mt-6"><EmptyBriefingState message="Loading settings..." /></div>}
        {error && <div className="mt-6 rounded-3xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 p-5 text-sm font-bold text-[#F0BFBF]">{error}</div>}
        {message && <div className="mt-6 rounded-3xl border border-[#6DAA45]/40 bg-[#6DAA45]/10 p-5 text-sm font-bold text-[#B5E28A]">{message}</div>}

        {!isLoading && !error && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Client</p>
              <select value={form.clientId} onChange={(event) => handleClientChange(event.target.value)} className="mt-4 w-full rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60">
                {clients.map((client) => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.clientName}
                  </option>
                ))}
              </select>
              <div className="mt-5 rounded-3xl border border-[#C9A961]/15 bg-[#111112] p-5">
                <p className="text-lg font-black text-[#ECEBE7]">{selectedClient?.clientName || "Selected client"}</p>
                <p className="mt-2 text-sm leading-6 text-[#A29E93]">
                  Every briefing includes a client version and advisor version, with missing-data notices if reports are unavailable.
                </p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cadence">
                  <select value={form.cadence} onChange={(event) => update("cadence", event.target.value)} className={inputClass}>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="custom">Custom</option>
                  </select>
                </Field>
                <Field label="Day of week">
                  <input value={form.dayOfWeek} onChange={(event) => update("dayOfWeek", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Time of delivery">
                  <input value={form.deliveryTime} onChange={(event) => update("deliveryTime", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Time zone">
                  <input value={form.timezone} onChange={(event) => update("timezone", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Delivery method">
                  <select value={form.deliveryMethod} onChange={(event) => update("deliveryMethod", event.target.value)} className={inputClass}>
                    <option value="email">Email</option>
                    <option value="dashboard">Dashboard notification</option>
                    <option value="both">Email and dashboard</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.isActive ? "active" : "inactive"} onChange={(event) => update("isActive", event.target.value === "active")} className={inputClass}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <label className="mt-5 flex items-center gap-3 rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-4 text-sm font-bold text-[#ECEBE7]">
                <input type="checkbox" checked={form.approvalRequired} onChange={(event) => update("approvalRequired", event.target.checked)} className="h-4 w-4 accent-[#C9A961]" />
                Require advisor approval before sending
              </label>

              <button disabled={isSaving || !form.clientId} onClick={() => void saveSettings()} className="mt-6 rounded-full bg-[#C9A961] px-6 py-4 text-sm font-black text-[#111112] hover:bg-[#DFC084] disabled:cursor-not-allowed disabled:opacity-50">
                {isSaving ? "Saving..." : "Save Briefing Settings"}
              </button>
            </section>
          </div>
        )}
      </section>
    </ClientBriefingsChrome>
  );
}

export default function ClientBriefingSettingsPage() {
  return (
    <Suspense fallback={<ClientBriefingsChrome active="Settings"><EmptyBriefingState message="Loading settings..." /></ClientBriefingsChrome>}>
      <ClientBriefingSettingsContent />
    </Suspense>
  );
}

const inputClass = "w-full rounded-2xl border border-[#C9A961]/25 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-[#7A7974]">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
