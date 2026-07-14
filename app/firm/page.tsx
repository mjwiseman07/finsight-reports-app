"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont } from "@/components/site-ui";
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
  Healthy: "border-[#6DAA45]/40 bg-[#6DAA45]/15 text-[#B5E28A]",
  "Moderate Review": "border-[#BB653B]/40 bg-[#BB653B]/15 text-[#DFC084]",
  "Needs Attention": "border-[#B85C5C]/40 bg-[#B85C5C]/15 text-[#F0BFBF]",
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
    <div className={`min-h-screen bg-[#111112] text-[#ECEBE7] ${headingFont}`}>
      <SiteNav />

      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 rounded-3xl border border-[#C9A961]/25 bg-[#1A1A1C]/85 px-5 py-4 shadow-2xl shadow-black/40 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#C9A961]">Advisory Firm Portal</p>
              <p className="mt-1 text-lg font-black text-[#ECEBE7]">Multi-Client Workspace</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/client-briefings" className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#ECEBE7] hover:border-[#C9A961]/50">
                Client Briefings
              </Link>
              <span className="rounded-full border border-[#C9A961]/40 bg-[#C9A961]/15 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#DFC084]">
                Phase 11
              </span>
            </div>
          </header>

          <section className="py-10">
            <div className="rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C] p-8 shadow-2xl shadow-black/40">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Advisory Firm Dashboard</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[#ECEBE7] md:text-7xl">
                Manage every client from one advisory workspace.
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[#A29E93]">
                Built for accounting firms, bookkeepers, controllers, and fractional CFO teams managing dozens or hundreds of client packages with role-aware visibility.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {firmPortalAudience.map((audience) => (
                  <span key={audience} className="rounded-full border border-[#C9A961]/20 bg-[#111112] px-3 py-1 text-xs font-bold text-[#A29E93]">
                    {audience}
                  </span>
                ))}
              </div>
            </div>

            {isLoading && (
              <div className="mt-6 rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6 text-sm font-bold text-[#A29E93]">
                Loading advisory firm portfolio...
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-3xl border border-[#BB653B]/40 bg-[#BB653B]/15 p-6 text-sm font-bold text-[#DFC084]">
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
                  <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Client Portfolio Management</p>
                        <h2 className="mt-2 text-3xl font-black text-[#ECEBE7]">Client list, package visibility, health, reviews, and delivery status</h2>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search clients"
                          className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none placeholder:text-[#7A7974] focus:border-[#C9A961]/60"
                        />
                        <select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60">
                          <option>All</option>
                          {firmHealthStatuses.map((item) => <option key={item.status}>{item.status}</option>)}
                        </select>
                        <select value={packageFilter} onChange={(event) => setPackageFilter(event.target.value)} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60">
                          <option>All</option>
                          {firmPackageLevels.map((item) => <option key={item}>{item}</option>)}
                        </select>
                        <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] px-4 py-3 text-sm font-bold text-[#ECEBE7] outline-none focus:border-[#C9A961]/60">
                          <option value="health-score">Sort by Health Score</option>
                          <option value="package">Sort by Package</option>
                          <option value="review-status">Sort by Review Status</option>
                          <option value="client-name">Sort by Client Name</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => setGroupFilter("All")} className={`rounded-full px-3 py-1 text-xs font-black transition ${groupFilter === "All" ? "bg-[#C9A961] text-[#111112]" : "border border-[#C9A961]/20 bg-[#111112] text-[#A29E93] hover:border-[#C9A961]/40"}`}>
                        All Groups
                      </button>
                      {groups.map((group) => (
                        <button key={group} onClick={() => setGroupFilter(group)} className={`rounded-full px-3 py-1 text-xs font-black transition ${groupFilter === group ? "bg-[#C9A961] text-[#111112]" : "border border-[#C9A961]/20 bg-[#111112] text-[#A29E93] hover:border-[#C9A961]/40"}`}>
                          {group}
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 overflow-hidden rounded-3xl border border-[#C9A961]/20">
                      <div className="grid grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_0.85fr_0.85fr] gap-3 bg-[#111112] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#C9A961]">
                        <span>Client</span>
                        <span>Package</span>
                        <span>Health</span>
                        <span>Review Items</span>
                        <span>Deliveries</span>
                        <span>Last Login</span>
                      </div>
                      <div className="divide-y divide-[#C9A961]/10">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => setSelectedClientId(client.id)}
                            className={`grid w-full grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_0.85fr_0.85fr] gap-3 px-4 py-4 text-left text-sm transition ${selectedClient?.id === client.id ? "bg-[#C9A961]/10" : "bg-[#1A1A1C] hover:bg-[#C9A961]/5"}`}
                          >
                            <span>
                              <span className="block font-black text-[#ECEBE7]">{client.name}</span>
                              <span className="mt-1 block text-xs font-bold text-[#7A7974]">{client.group}</span>
                            </span>
                            <span className="font-bold text-[#A29E93]">{client.packageLevel}</span>
                            <span>
                              <span className={`rounded-full border px-2 py-1 text-xs font-black ${healthStyles[client.healthStatus] || "border-[#C9A961]/20 bg-[#111112] text-[#A29E93]"}`}>
                                {client.healthStatus}
                              </span>
                              <span className="mt-2 block text-xs text-[#7A7974]">{client.healthScore}/100</span>
                            </span>
                            <span className="font-black text-[#DFC084]">{client.outstandingReviewItems}</span>
                            <span className="font-black text-[#DFC084]">{client.upcomingDeliveries}</span>
                            <span className="text-xs font-bold text-[#A29E93]">{client.lastLogin}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-6">
                    <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40">
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Client Health Dashboard</p>
                      <h3 className="mt-2 text-2xl font-black text-[#ECEBE7]">At-a-glance portfolio visibility</h3>
                      <div className="mt-4 grid gap-3">
                        {firmHealthStatuses.map((item) => (
                          <div key={item.status} className={`rounded-2xl border p-4 ${healthStyles[item.status] || "border-[#C9A961]/20 bg-[#111112] text-[#A29E93]"}`}>
                            <p className="text-sm font-black">{item.status}</p>
                            <p className="mt-1 text-xs leading-5 opacity-80">{item.description}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {firmHealthScoringFactors.map((factor) => (
                          <span key={factor} className="rounded-full border border-[#C9A961]/20 bg-[#111112] px-3 py-1 text-xs font-bold text-[#A29E93]">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40">
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Firm KPI Dashboard</p>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border border-[#C9A961]/40 bg-[#C9A961]/15 px-4 py-3">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#C9A961]">Firm Pricing Band</p>
                          <p className="mt-2 text-lg font-black text-[#ECEBE7]">{kpis.firmPricingBand?.label || firmPricingBands[0].label}</p>
                          <p className="mt-1 text-xs font-bold text-[#A29E93]">{kpis.firmPricingBand?.clientRange || firmPricingBands[0].clientRange}</p>
                        </div>
                        {Object.entries(kpis.firmPricingBand?.pricing || firmPricingBands[0].pricing).map(([packageName, price]) => (
                          <div key={packageName} className="flex items-center justify-between rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3">
                            <span className="text-sm font-bold text-[#A29E93]">{packageName}</span>
                            <span className="text-sm font-black text-[#DFC084]">{price}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between rounded-2xl border border-[#C9A961]/15 bg-[#111112] px-4 py-3">
                          <span className="text-sm font-bold text-[#A29E93]">Active Executive Deliveries</span>
                          <span className="text-sm font-black text-[#DFC084]">{kpis.activeExecutiveDeliveries}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Advisory Task Center</p>
                    <h2 className="mt-2 text-3xl font-black text-[#ECEBE7]">Review Queue</h2>
                    <div className="mt-5 grid gap-3">
                      {(reviewQueue.length ? reviewQueue : firmReviewQueueTypes.map((type, index) => ({ id: type, clientName: "No assigned client", type, status: "empty", priority: index === 0 ? "normal" : "low" }))).map((item) => (
                        <div key={item.id} className="rounded-3xl border border-[#C9A961]/20 bg-[#111112] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-[#ECEBE7]">{item.type}</p>
                              <p className="mt-1 text-xs font-bold text-[#7A7974]">{item.clientName}</p>
                            </div>
                            <span className="rounded-full border border-[#C9A961]/25 bg-[#1A1A1C] px-3 py-1 text-xs font-black text-[#DFC084]">{item.priority}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Client Workspace</p>
                    <h2 className="mt-2 text-3xl font-black text-[#ECEBE7]">{selectedClient?.name || "Select a client"}</h2>
                    {selectedClient && (
                      <>
                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                          {(selectedClient.personaViews || firmClientPersonaViews).map((view) => (
                            <div key={view} className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-4">
                              <p className="text-sm font-black text-[#ECEBE7]">{view}</p>
                              <p className="mt-1 text-xs leading-5 text-[#7A7974]">Client-specific persona context</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <DeliveryStatus label="Weekly Brief" status={selectedClient.weeklyBriefStatus} />
                          <DeliveryStatus label="Monthly Package" status={selectedClient.monthlyPackageStatus} />
                          <DeliveryStatus label="Quarterly Review" status={selectedClient.quarterlyReviewStatus} />
                        </div>
                        <div className="mt-5 rounded-3xl border border-[#6DAA45]/25 bg-[#6DAA45]/10 p-5">
                          <p className="text-sm font-black text-[#B5E28A]">Client-Specific AI Memory</p>
                          <p className="mt-2 text-sm leading-6 text-[#B5E28A]/80">{firmAiMemoryBoundaries.principle}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {firmAiMemoryBoundaries.allowedMemory.map((item) => (
                              <span key={item} className="rounded-full border border-[#6DAA45]/30 bg-[#111112] px-3 py-1 text-xs font-bold text-[#B5E28A]">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </section>
                </div>

                <section className="mt-8 rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C] p-6 shadow-2xl shadow-black/40">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Future Preparation</p>
                  <h2 className="mt-2 text-3xl font-black text-[#ECEBE7]">Prepared architecture, not built yet</h2>
                  <p className="mt-3 max-w-3xl leading-7 text-[#A29E93]">
                    Phase 11 keeps the data model ready for benchmarking, profitability, utilization, and advisory workflow automation while preserving clean role-aware workflows.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {firmFuturePreparationAreas.map((area) => (
                      <span key={area} className="rounded-full border border-[#C9A961]/20 bg-[#111112] px-3 py-1 text-xs font-bold text-[#A29E93]">
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

      <SiteFooter />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C] p-5 shadow-xl shadow-black/30">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7A7974]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#DFC084]">{value}</p>
    </div>
  );
}

function DeliveryStatus({ label, status }: { label: string; status: string }) {
  const isKnownStatus = firmDeliveryStatuses.includes(status);
  return (
    <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7A7974]">{label}</p>
      <p className={`mt-2 text-sm font-black ${isKnownStatus ? "text-[#ECEBE7]" : "text-[#DFC084]"}`}>{status}</p>
    </div>
  );
}
