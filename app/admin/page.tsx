"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdvisacorLogo } from "../../components/AdvisacorLogo";
import { SupportHelpButton } from "../../components/SupportHelpButton";
import { superAdminScreens } from "../../lib/super-admin";
import { supportTicketStatuses } from "../../lib/support-center";

type DemoCompany = {
  id: string;
  name: string;
  status: string;
  setupStatus?: string;
  packageLevel: string;
  personaMode: string;
  primaryPersona?: string;
  companyAdmin?: string;
  users?: Array<{ email: string; role: string; status: string }>;
  deliverySettings?: Record<string, string | boolean | string[]>;
  industry?: string;
  industryType?: string;
  lastPackageGenerated: string;
  lastLogin: string;
  jobStatus: string;
  failedJobs: number;
  demoData?: Record<string, Record<string, string | number>>;
};

type AdminOverview = {
  admin?: { email: string; role: string };
  screens?: string[];
  capabilities?: string[];
  demo_companies?: DemoCompany[];
  jobs?: Array<Record<string, string>>;
  failed_jobs?: Array<Record<string, string>>;
  audit_logs?: Array<Record<string, string>>;
  system_health?: Record<string, boolean>;
  job_storage?: {
    provider?: string;
    supports?: string[];
    trigger_dev_configured?: boolean;
    production_setup_missing?: string | null;
  };
};

type SupportTicket = {
  id: string;
  ticketNumber: number | string;
  category: string;
  type: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  userEmail: string;
  companyName: string;
  packageLevel: string;
  persona: string;
  assignedTo: string;
  adminNotes: string;
  createdAt: string;
};

const adminWorkspaceCards = [
  {
    title: "Generate PDF Package",
    description: "Create a test PDF package using the selected company's stored persona and package.",
    action: "test_pdf_generated",
    button: "Generate Test PDF",
  },
  {
    title: "Generate PowerPoint",
    description: "Create a test PowerPoint package for workflow validation.",
    action: "test_powerpoint_generated",
    button: "Generate Test PowerPoint",
  },
  {
    title: "Weekly Executive Brief Tester",
    description: "Trigger a weekly executive brief test email for the current demo context.",
    action: "test_weekly_brief_email_triggered",
    button: "Trigger Brief Test",
  },
  {
    title: "Ask Advisacor Tester",
    description: "Open a test Ask Advisacor workflow scoped to the active demo company.",
    action: "ask_advisacor_tested",
    button: "Test Ask Advisacor",
  },
  {
    title: "User Management",
    description: "Review internal test users and validate admin-only access paths.",
    action: "user_management_opened",
    button: "Log User Management Test",
  },
  {
    title: "Demo Data Reset",
    description: "Reset demo/test state for repeatable internal validation.",
    action: "demo_data_reset",
    button: "Reset Demo Data",
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportSummary, setSupportSummary] = useState({ bugs: 0, supportIssues: 0, featureRequests: 0 });
  const [supportSearch, setSupportSearch] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const demoCompanies = useMemo(() => overview.demo_companies || [], [overview.demo_companies]);
  const selectedCompany = demoCompanies.find((company) => company.id === selectedCompanyId) || demoCompanies[0] || null;

  const loadSupportTickets = async (query = "") => {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    if (!token) return;

    const params = new URLSearchParams();
    if (query) params.set("q", query);

    const response = await fetch(`/api/admin/support-tickets?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (response.ok) {
      setSupportTickets(result.tickets || []);
      setSupportSummary(result.summary || { bugs: 0, supportIssues: 0, featureRequests: 0 });
    }
  };

  useEffect(() => {
    async function loadAdmin() {
      setIsLoading(true);
      setError("");

      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        router.replace("/signin?next=/admin");
        return;
      }

      try {
        const response = await fetch("/api/admin/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Super admin access denied.");
          return;
        }

        setOverview(result);
        setSelectedCompanyId(result.demo_companies?.[0]?.id || "");
        await loadSupportTickets();
      } catch {
        setError("Unable to load Super Admin Mode.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAdmin();
  }, [router]);

  const updateSupportTicket = async (ticketId: string, updates: Record<string, string>) => {
    setSupportMessage("");
    const token = window.localStorage.getItem("supabase_access_token") || "";

    const response = await fetch("/api/admin/support-tickets", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ticket_id: ticketId, ...updates }),
    });
    const result = await response.json();

    if (!response.ok) {
      setSupportMessage(result.error || "Unable to update support ticket.");
      return;
    }

    setSupportTickets((current) => current.map((ticket) => (ticket.id === ticketId ? result.ticket : ticket)));
    setSupportMessage(`Ticket #${result.ticket.ticketNumber} updated.`);
  };

  const runAdminAction = async (action: string, extra: Record<string, string> = {}) => {
    setError("");
    setMessage("");
    setIsRunningAction(true);

    try {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          company_id: selectedCompany?.id || "",
          persona_mode: selectedCompany?.personaMode || "",
          package_level: selectedCompany?.packageLevel || "",
          ...extra,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Super admin action failed.");
        return;
      }

      setMessage(result.message || "Super admin action logged.");
    } catch {
      setError("Super admin action failed.");
    } finally {
      setIsRunningAction(false);
    }
  };

  const startFromBeginning = async (accountType = "my-own-company") => {
    await runAdminAction("onboarding_started", { workflow: "start_from_beginning", account_type: accountType });
    const params = new URLSearchParams({
      superAdmin: "true",
      companyTemplate: selectedCompany?.id || "",
      accountType,
    });
    window.location.assign(`/onboarding?${params.toString()}`);
  };

  const launchCompanyDashboard = async () => {
    await runAdminAction("test_user_session_started", { workflow: "launch_company_dashboard" });
    const params = new URLSearchParams({
      journey: "company-dashboard",
      testCompany: selectedCompany?.id || "",
      persona: selectedCompany?.personaMode || "",
      package: selectedCompany?.packageLevel || "",
      superAdmin: "true",
    });
    params.set("x-dev-bypass", "true");
    window.location.assign(`/dashboard?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(525px,46.5vw)] px-0 py-0">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="text-sm font-bold text-slate-300">
            {overview.admin?.email ? `Logged in as ${overview.admin.email}` : "Validating internal admin access"}
          </div>
          <SupportHelpButton compact />
        </header>

        {overview.admin && (
          <div className="sticky top-3 z-40 mt-5 grid gap-3 rounded-3xl border border-red-300/40 bg-red-500/15 p-4 text-sm font-bold text-red-50 shadow-2xl shadow-black/25 backdrop-blur-xl md:grid-cols-4">
            <div>
              <span className="block text-xs uppercase tracking-[0.18em] text-red-200/80">SUPER ADMIN MODE</span>
              <span>{overview.admin.email}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.14em] text-red-200/80">Company Persona</span>
              <span>{selectedCompany?.personaMode || "Configured during onboarding"}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.14em] text-red-200/80">Company Package</span>
              <span>{selectedCompany?.packageLevel || "Configured during onboarding"}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-[0.14em] text-red-200/80">Current Test Company</span>
              <span>{selectedCompany?.name || "Select a demo company"}</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm font-bold text-slate-300">
            Validating super admin access...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-3xl border border-red-300/30 bg-red-500/10 p-6 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-3xl border border-emerald-300/30 bg-emerald-500/10 p-6 text-sm font-bold text-emerald-100">
            {message}
          </div>
        )}

        {!isLoading && !error && overview.admin && (
          <section className="mt-8 grid gap-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Super Admin Dashboard</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">Company Testing Center</h1>
              <p className="mt-3 max-w-3xl leading-7 text-slate-300">
                Validate the same journey a customer uses: company onboarding, stored persona, stored package level, role-based users, delivery settings, package generation, jobs, logs, and demo-only QA sessions.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(overview.screens || superAdminScreens).map((screen) => (
                  <a key={screen} href={`#${screen.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300 hover:bg-white/[0.1]">
                    {screen}
                  </a>
                ))}
              </div>
            </section>

            <section id="system-health" className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(overview.system_health || {}).map(([key, value]) => (
                <div key={key} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{key.replace(/_/g, " ")}</p>
                  <p className={`mt-3 text-2xl font-black ${value ? "text-emerald-200" : "text-red-200"}`}>
                    {value ? "Configured" : "Needs setup"}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
              <Panel id="company-testing-center" title="Company Testing Center">
                <div className="mb-6 rounded-3xl border border-[#FF7A1A]/25 bg-[#FF7A1A]/10 p-5">
                  <p className="text-sm font-black text-white">Test Journey Launcher</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Start with onboarding when validating real customer setup. Launching a dashboard uses the selected company's stored persona, package, users, and delivery settings.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void startFromBeginning("my-own-company")}
                      disabled={isRunningAction || !selectedCompany}
                      className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-left text-sm font-black text-white transition hover:border-[#FF7A1A]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="block">Start My Own Company</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">Test owner/internal team onboarding from Step 0.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void startFromBeginning("bookkeeper-advisor")}
                      disabled={isRunningAction || !selectedCompany}
                      className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-left text-sm font-black text-white transition hover:border-[#FF7A1A]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="block">Start Bookkeeper / Advisor</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">Test solo or firm practice setup plus first client.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void startFromBeginning("fractional-cfo-firm")}
                      disabled={isRunningAction || !selectedCompany}
                      className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-left text-sm font-black text-white transition hover:border-[#FF7A1A]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="block">Start Fractional CFO / Firm</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">Test advisory firm setup plus client executive reporting.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void launchCompanyDashboard()}
                      disabled={isRunningAction || !selectedCompany}
                      className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-left text-sm font-black text-white transition hover:border-[#FF7A1A]/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="block">Launch Company Dashboard</span>
                      <span className="mt-1 block text-xs font-bold leading-5 text-slate-500">Open the selected demo company as a test user session.</span>
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {demoCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => setSelectedCompanyId(company.id)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        selectedCompany?.id === company.id
                          ? "border-[#FF7A1A]/70 bg-[#FF7A1A]/15"
                          : "border-white/10 bg-slate-950/60 hover:border-white/25"
                      }`}
                    >
                      <p className="text-sm font-black text-white">{company.name}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{company.industry || company.status}</p>
                      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-400">
                        <p>Admin user: <span className="text-slate-200">{company.companyAdmin || "Demo admin"}</span></p>
                        <p>Industry type: <span className="text-slate-200">{company.industryType || "Other"}</span></p>
                        <p>Primary persona: <span className="text-slate-200">{company.personaMode}</span></p>
                        <p>Package: <span className="text-slate-200">{company.packageLevel}</span></p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">{company.setupStatus || "Configured"}</span>
                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">{company.packageLevel}</span>
                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">{company.personaMode}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-300">Demo-only QA session tools</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    This opens the selected demo company as the selected test user for QA testing. Demo impersonation remains restricted to demo/test companies.
                  </p>
                  <button
                    type="button"
                    onClick={() => runAdminAction("impersonation_started")}
                    disabled={isRunningAction || !selectedCompany}
                    className="mt-4 rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Launch Test User Session
                  </button>
                </details>
                {selectedCompany?.demoData && (
                  <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-sm font-black text-white">Configured Demo Data</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {Object.entries(selectedCompany.demoData).map(([section, values]) => (
                        <div key={section} className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#FFB36F]">{section.replace(/([A-Z])/g, " $1")}</p>
                          <div className="mt-3 grid gap-2">
                            {Object.entries(values).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between gap-3 text-xs">
                                <span className="capitalize text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span>
                                <span className="font-black text-slate-200">
                                  {typeof value === "number" ? value.toLocaleString() : value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>

              <Panel id="user-management" title="User Management">
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-sm font-black text-white">Super Admin User</p>
                  <p className="mt-2 text-sm font-bold text-slate-300">{overview.admin.email}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{overview.admin.role}</p>
                </div>
                <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                  <p className="text-sm font-black text-white">Selected Company Users</p>
                  <div className="mt-3 grid gap-3">
                    {(selectedCompany?.users || []).map((user, index) => (
                      <div key={`${user.email}-${user.role}-${user.status}-${index}`} className="rounded-2xl border border-white/10 bg-[#0A1020] p-4">
                        <p className="text-sm font-black text-slate-100">{user.email}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          {user.role.replace(/_/g, " ")} | {user.status}
                        </p>
                      </div>
                    ))}
                    {(selectedCompany?.users || []).length === 0 && (
                      <p className="rounded-2xl bg-[#0A1020] px-4 py-3 text-sm font-bold text-slate-400">No demo users configured.</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => runAdminAction("company_users_viewed")}
                  disabled={isRunningAction}
                  className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-[#FF7A1A]/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  View Company Users
                </button>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              {adminWorkspaceCards.map((card) => (
                <Panel key={card.title} id={card.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} title={card.title}>
                  <p className="text-sm leading-6 text-slate-400">{card.description}</p>
                  <div className="mt-4 rounded-2xl bg-slate-950/60 px-4 py-3 text-xs font-bold text-slate-400">
                    Context: {selectedCompany?.name || "No company selected"} | {selectedCompany?.personaMode || "Company persona"} | {selectedCompany?.packageLevel || "Company package"}
                  </div>
                  <button
                    type="button"
                    onClick={() => runAdminAction(card.action)}
                    disabled={isRunningAction}
                    className="mt-4 rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {card.button}
                  </button>
                </Panel>
              ))}
            </section>

            <Panel id="support-center" title="Support Center">
              <div className="grid gap-4 md:grid-cols-3">
                <SupportSummaryCard label="Support Issues" value={supportSummary.supportIssues} />
                <SupportSummaryCard label="Bug Reports" value={supportSummary.bugs} />
                <SupportSummaryCard label="Feature Requests" value={supportSummary.featureRequests} />
              </div>
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input
                  value={supportSearch}
                  onChange={(event) => setSupportSearch(event.target.value)}
                  placeholder="Search tickets, companies, users, or descriptions"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[#FF7A1A]/50"
                />
                <button
                  type="button"
                  onClick={() => void loadSupportTickets(supportSearch)}
                  className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white"
                >
                  Search Tickets
                </button>
              </div>
              {supportMessage && <p className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">{supportMessage}</p>}
              <div className="mt-5 grid gap-4">
                {supportTickets.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-400">No support tickets found.</p>
                )}
                {supportTickets.map((ticket) => (
                  <article key={ticket.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-black text-white">Ticket #{ticket.ticketNumber}: {ticket.subject}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                          {ticket.type} | {ticket.category} | {ticket.priority}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-400">{ticket.description}</p>
                        <p className="mt-3 text-xs font-bold text-slate-500">
                          {ticket.companyName || "No company"} | {ticket.userEmail || "No user"} | {ticket.packageLevel || "No package"} | {ticket.persona || "No persona"}
                        </p>
                      </div>
                      <div className="grid min-w-64 gap-3">
                        <select
                          value={ticket.status}
                          onChange={(event) => void updateSupportTicket(ticket.id, { status: event.target.value })}
                          className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm font-bold text-white"
                        >
                          {supportTicketStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <input
                          defaultValue={ticket.assignedTo}
                          placeholder="Assign to"
                          onBlur={(event) => void updateSupportTicket(ticket.id, { assigned_to: event.target.value })}
                          className="rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm font-bold text-white"
                        />
                      </div>
                    </div>
                    <textarea
                      defaultValue={ticket.adminNotes}
                      placeholder="Admin notes"
                      onBlur={(event) => void updateSupportTicket(ticket.id, { admin_notes: event.target.value })}
                      rows={3}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-[#FF7A1A]/50"
                    />
                  </article>
                ))}
              </div>
            </Panel>

            <section className="grid gap-6 xl:grid-cols-2">
              <Panel id="job-queue" title="Job Queue">
                <div className="mb-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
                  <p className="text-sm font-black text-emerald-100">Job Storage: Configured</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-50/80">
                    Provider: {overview.job_storage?.provider || "internal_demo_job_storage"}. Supports PDF, PowerPoint, executive brief, monthly package, AI commentary, forecast, and oversight review jobs.
                  </p>
                  {overview.job_storage?.production_setup_missing && (
                    <p className="mt-2 text-xs leading-5 text-amber-100">
                      Production next step: {overview.job_storage.production_setup_missing}
                    </p>
                  )}
                </div>
                <div className="grid gap-3">
                  {(overview.jobs || []).length === 0 && (
                    <p className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-400">No background jobs found yet.</p>
                  )}
                  {(overview.jobs || []).slice(0, 10).map((job) => (
                    <div key={job.id} className="rounded-2xl bg-slate-950/60 p-4">
                      <p className="text-sm font-black text-white">{job.job_type || "Background Job"}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{job.status || "unknown"}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel id="audit-logs" title="Audit Logs">
                <div className="grid gap-3">
                  {(overview.audit_logs || []).length === 0 && (
                    <p className="rounded-2xl bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-400">No audit logs found yet.</p>
                  )}
                  {(overview.audit_logs || []).slice(0, 10).map((log) => (
                    <div key={log.id} className="rounded-2xl bg-slate-950/60 p-4">
                      <p className="text-sm font-black text-white">{log.event_type || "audit_event"}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{log.created_at || "No timestamp"}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SupportSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
