"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import {
  firmAiMemoryBoundaries,
  firmClientPersonaViews,
  firmDeliveryStatuses,
  firmFuturePreparationAreas,
  firmHealthScoringFactors,
  firmHealthStatuses,
  firmPackageLevels,
  firmPricingBands,
  firmPortalAudience,
  firmReviewQueueTypes,
} from "../../lib/advisory-firm-portal";

type FirmClient = {
  id: string;
  name: string;
  group: string;
  packageLevel: string;
  subscriptionStatus: string;
  healthStatus: string;
  healthScore: number;
  lastPackageGenerated: string;
  lastLogin: string;
  outstandingReviewItems: number;
  upcomingDeliveries: number;
  weeklyBriefStatus: string;
  monthlyPackageStatus: string;
  quarterlyReviewStatus: string;
  ownerVisibilityRestricted: boolean;
  personaViews: string[];
};

type ReviewItem = {
  id: string;
  clientName: string;
  type: string;
  status: string;
  priority: string;
};

type FirmKpis = {
  totalClients: number;
  clientsByPackage: Record<string, number>;
  firmPricingBand?: {
    label: string;
    clientRange: string;
    pricing: Record<string, string>;
  };
  activeExecutiveDeliveries: number;
  openReviewItems: number;
  upcomingMonthlyPackages: number;
};

const emptyKpis: FirmKpis = {
  totalClients: 0,
  clientsByPackage: {},
  activeExecutiveDeliveries: 0,
  openReviewItems: 0,
  upcomingMonthlyPackages: 0,
};

const healthStyles: Record<string, string> = {
  Healthy: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  "Moderate Review": "border-amber-300/30 bg-amber-400/10 text-amber-100",
  "Needs Attention": "border-red-300/30 bg-red-400/10 text-red-100",
};

export default function FirmDashboardPage() {
  const [clients, setClients] = useState<FirmClient[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [kpis, setKpis] = useState<FirmKpis>(emptyKpis);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("All");
  const [packageFilter, setPackageFilter] = useState("All");
  const [groupFilter, setGroupFilter] = useState("All");
  const [sortMode, setSortMode] = useState("health-score");
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    async function loadFirmClients() {
      setIsLoading(true);
      setError("");

      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        window.location.href = "/signin";
        return;
      }

      try {
        const response = await fetch("/api/firm/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load advisory firm dashboard.");
          return;
        }

        setClients(result.clients || []);
        setReviewQueue(result.review_queue || []);
        setKpis(result.kpis || emptyKpis);
        setSelectedClientId(result.clients?.[0]?.id || "");
      } catch {
        setError("Unable to load advisory firm dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadFirmClients();
  }, []);

  const groups = useMemo(() => Array.from(new Set(clients.map((client) => client.group))).sort(), [clients]);
  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0] || null;

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clients
      .filter((client) => {
        const matchesSearch =
          !normalizedSearch ||
          client.name.toLowerCase().includes(normalizedSearch) ||
          client.group.toLowerCase().includes(normalizedSearch);
        const matchesHealth = healthFilter === "All" || client.healthStatus === healthFilter;
        const matchesPackage = packageFilter === "All" || client.packageLevel === packageFilter;
        const matchesGroup = groupFilter === "All" || client.group === groupFilter;
        return matchesSearch && matchesHealth && matchesPackage && matchesGroup;
      })
      .sort((a, b) => {
        if (sortMode === "package") return a.packageLevel.localeCompare(b.packageLevel);
        if (sortMode === "review-status") return b.outstandingReviewItems - a.outstandingReviewItems;
        if (sortMode === "client-name") return a.name.localeCompare(b.name);
        return b.healthScore - a.healthScore;
      });
  }, [clients, groupFilter, healthFilter, packageFilter, search, sortMode]);

  return (
    <main className="advisacor-dark-grid min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-4 z-40 flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0A1020]/78 px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/client-briefings" className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
              Client Briefings
            </Link>
            <span className="rounded-full border border-[#FF7A1A]/30 bg-[#FF7A1A]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#FFD0AB]">
              Phase 11
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-slate-200">
              Multi-Client Advisory Firm Portal
            </span>
          </div>
        </header>

        <section className="py-10">
          <div className="rounded-[2rem] border border-blue-300/20 bg-blue-500/10 p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Advisory Firm Dashboard</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
              Manage every client from one advisory workspace.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              Built for accounting firms, bookkeepers, controllers, and fractional CFO teams managing dozens or hundreds of client packages with role-aware visibility.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {firmPortalAudience.map((audience) => (
                <span key={audience} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                  {audience}
                </span>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm font-bold text-slate-300">
              Loading advisory firm portfolio...
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-3xl border border-amber-300/30 bg-amber-400/10 p-6 text-sm font-bold text-amber-100">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <>
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
                <KpiCard label="Total Clients" value={String(kpis.totalClients)} />
                <KpiCard label="Essential" value={String(kpis.clientsByPackage.Essential || 0)} />
                <KpiCard label="Professional" value={String(kpis.clientsByPackage.Professional || 0)} />
                <KpiCard label="Virtual CFO" value={String(kpis.clientsByPackage["Virtual CFO"] || 0)} />
                <KpiCard label="Open Review Items" value={String(kpis.openReviewItems)} />
                <KpiCard label="Upcoming Packages" value={String(kpis.upcomingMonthlyPackages)} />
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Client Portfolio Management</p>
                      <h2 className="mt-2 text-3xl font-black">Client list, package visibility, health, reviews, and delivery status</h2>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search clients"
                        className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-[#FF7A1A]/60"
                      />
                      <select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">
                        <option>All</option>
                        {firmHealthStatuses.map((item) => <option key={item.status}>{item.status}</option>)}
                      </select>
                      <select value={packageFilter} onChange={(event) => setPackageFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">
                        <option>All</option>
                        {firmPackageLevels.map((item) => <option key={item}>{item}</option>)}
                      </select>
                      <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">
                        <option value="health-score">Sort by Health Score</option>
                        <option value="package">Sort by Package</option>
                        <option value="review-status">Sort by Review Status</option>
                        <option value="client-name">Sort by Client Name</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setGroupFilter("All")} className={`rounded-full px-3 py-1 text-xs font-black ${groupFilter === "All" ? "bg-[#FF7A1A] text-white" : "bg-white/[0.06] text-slate-300"}`}>
                      All Groups
                    </button>
                    {groups.map((group) => (
                      <button key={group} onClick={() => setGroupFilter(group)} className={`rounded-full px-3 py-1 text-xs font-black ${groupFilter === group ? "bg-[#FF7A1A] text-white" : "bg-white/[0.06] text-slate-300"}`}>
                        {group}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                    <div className="grid grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_0.85fr_0.85fr] gap-3 bg-slate-950/80 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <span>Client</span>
                      <span>Package</span>
                      <span>Health</span>
                      <span>Review Items</span>
                      <span>Deliveries</span>
                      <span>Last Login</span>
                    </div>
                    <div className="divide-y divide-white/10">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedClientId(client.id)}
                          className={`grid w-full grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_0.85fr_0.85fr] gap-3 px-4 py-4 text-left text-sm transition hover:bg-white/[0.04] ${selectedClient?.id === client.id ? "bg-white/[0.06]" : "bg-slate-950/35"}`}
                        >
                          <span>
                            <span className="block font-black text-white">{client.name}</span>
                            <span className="mt-1 block text-xs font-bold text-slate-500">{client.group}</span>
                          </span>
                          <span className="font-bold text-slate-300">{client.packageLevel}</span>
                          <span>
                            <span className={`rounded-full border px-2 py-1 text-xs font-black ${healthStyles[client.healthStatus] || "border-white/10 bg-white/[0.06] text-slate-300"}`}>
                              {client.healthStatus}
                            </span>
                            <span className="mt-2 block text-xs text-slate-500">{client.healthScore}/100</span>
                          </span>
                          <span className="font-black text-white">{client.outstandingReviewItems}</span>
                          <span className="font-black text-white">{client.upcomingDeliveries}</span>
                          <span className="text-xs font-bold text-slate-400">{client.lastLogin}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-6">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">Client Health Dashboard</p>
                    <h3 className="mt-2 text-2xl font-black">At-a-glance portfolio visibility</h3>
                    <div className="mt-4 grid gap-3">
                      {firmHealthStatuses.map((item) => (
                        <div key={item.status} className={`rounded-2xl border p-4 ${healthStyles[item.status]}`}>
                          <p className="text-sm font-black">{item.status}</p>
                          <p className="mt-1 text-xs leading-5 opacity-80">{item.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {firmHealthScoringFactors.map((factor) => (
                        <span key={factor} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Firm KPI Dashboard</p>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#FFB36F]">Firm Pricing Band</p>
                        <p className="mt-2 text-lg font-black text-white">{kpis.firmPricingBand?.label || firmPricingBands[0].label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{kpis.firmPricingBand?.clientRange || firmPricingBands[0].clientRange}</p>
                      </div>
                      {Object.entries(kpis.firmPricingBand?.pricing || firmPricingBands[0].pricing).map(([packageName, price]) => (
                        <div key={packageName} className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3">
                          <span className="text-sm font-bold text-slate-300">{packageName}</span>
                          <span className="text-sm font-black text-white">{price}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-2xl bg-slate-950/60 px-4 py-3">
                        <span className="text-sm font-bold text-slate-300">Active Executive Deliveries</span>
                        <span className="text-sm font-black text-white">{kpis.activeExecutiveDeliveries}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Advisory Task Center</p>
                  <h2 className="mt-2 text-3xl font-black">Review Queue</h2>
                  <div className="mt-5 grid gap-3">
                    {(reviewQueue.length ? reviewQueue : firmReviewQueueTypes.map((type, index) => ({ id: type, clientName: "No assigned client", type, status: "empty", priority: index === 0 ? "normal" : "low" }))).map((item) => (
                      <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{item.type}</p>
                            <p className="mt-1 text-xs font-bold text-slate-500">{item.clientName}</p>
                          </div>
                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">{item.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Client Workspace</p>
                  <h2 className="mt-2 text-3xl font-black">{selectedClient?.name || "Select a client"}</h2>
                  {selectedClient && (
                    <>
                      <div className="mt-5 grid gap-3 md:grid-cols-4">
                        {(selectedClient.personaViews || firmClientPersonaViews).map((view) => (
                          <div key={view} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                            <p className="text-sm font-black text-white">{view}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">Client-specific persona context</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <DeliveryStatus label="Weekly Brief" status={selectedClient.weeklyBriefStatus} />
                        <DeliveryStatus label="Monthly Package" status={selectedClient.monthlyPackageStatus} />
                        <DeliveryStatus label="Quarterly Review" status={selectedClient.quarterlyReviewStatus} />
                      </div>

                      <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                        <p className="text-sm font-black text-emerald-100">Client-Specific AI Memory</p>
                        <p className="mt-2 text-sm leading-6 text-emerald-50/80">{firmAiMemoryBoundaries.principle}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {firmAiMemoryBoundaries.allowedMemory.map((item) => (
                            <span key={item} className="rounded-full bg-slate-950/40 px-3 py-1 text-xs font-bold text-emerald-100">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </div>

              <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Future Preparation</p>
                <h2 className="mt-2 text-3xl font-black">Prepared architecture, not built yet</h2>
                <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                  Phase 11 keeps the data model ready for benchmarking, profitability, utilization, and advisory workflow automation while preserving clean role-aware workflows.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {firmFuturePreparationAreas.map((area) => (
                    <span key={area} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                      {area}
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function DeliveryStatus({ label, status }: { label: string; status: string }) {
  const isKnownStatus = firmDeliveryStatuses.includes(status);
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-black ${isKnownStatus ? "text-white" : "text-amber-100"}`}>{status}</p>
    </div>
  );
}
