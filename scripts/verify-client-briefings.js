const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadLocalEnv() {
  if (!fs.existsSync(".env.local")) throw new Error(".env.local is missing.");

  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = value;
    });
}

async function countRows(supabaseAdmin, table) {
  const { count, error } = await supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count || 0;
}

async function findUserByEmail(supabaseAdmin, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data?.users || data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function verifyClientBriefings() {
  loadLocalEnv();

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const requiredTables = [
    "firms",
    "firm_memberships",
    "firm_clients",
    "client_briefing_settings",
    "client_briefings",
    "client_briefing_events",
  ];

  const counts = {};
  for (const table of requiredTables) {
    counts[table] = await countRows(supabaseAdmin, table);
  }

  const { data: demoFirm, error: firmError } = await supabaseAdmin
    .from("firms")
    .select("id, name, advisor_name, reply_to_email")
    .eq("name", "Advisacor Demo Advisory")
    .limit(1);
  if (firmError) throw firmError;

  const firm = demoFirm?.[0];
  if (!firm) throw new Error("Demo firm was not found.");

  const superAdminUser = await findUserByEmail(supabaseAdmin, "mwiseman@advisacor.com");
  if (!superAdminUser) throw new Error("Super Admin auth user mwiseman@advisacor.com was not found.");

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("firm_memberships")
    .select("id, role, status")
    .eq("firm_id", firm.id)
    .eq("user_id", superAdminUser.id)
    .eq("status", "active")
    .limit(1);
  if (membershipError) throw membershipError;
  if (!membership?.[0]) throw new Error("Super Admin does not have active firm membership for Client Briefings.");

  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("firm_clients")
    .select("id, name, firm_id, health_status, package_level")
    .eq("firm_id", firm.id)
    .order("name", { ascending: true });
  if (clientsError) throw clientsError;

  const clientIds = (clients || []).map((client) => client.id);
  if (clientIds.length < 4) throw new Error(`Expected at least 4 demo clients, found ${clientIds.length}.`);

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("client_briefing_settings")
    .select("id, client_id, cadence, delivery_method, approval_required")
    .in("client_id", clientIds);
  if (settingsError) throw settingsError;

  const { data: briefings, error: briefingsError } = await supabaseAdmin
    .from("client_briefings")
    .select("id, client_id, status, risk_level, missing_reports, client_briefing_content, advisor_briefing_content")
    .in("client_id", clientIds);
  if (briefingsError) throw briefingsError;

  if ((settings || []).length < clientIds.length) {
    throw new Error(`Expected briefing settings for each demo client, found ${(settings || []).length}.`);
  }

  if ((briefings || []).length < clientIds.length) {
    throw new Error(`Expected at least one briefing for each demo client, found ${(briefings || []).length}.`);
  }

  const hasClientContent = (briefings || []).every((briefing) => briefing.client_briefing_content?.executiveSummary);
  const hasAdvisorContent = (briefings || []).every((briefing) => briefing.advisor_briefing_content?.suggestedTalkingPoints);
  const hasRiskLevels = (briefings || []).every((briefing) => ["Low", "Medium", "High"].includes(briefing.risk_level));
  const hasWorkflowStatuses = (briefings || []).every((briefing) =>
    ["Draft", "Pending Approval", "Approved", "Sent", "Failed", "Skipped"].includes(briefing.status),
  );

  if (!hasClientContent) throw new Error("One or more briefings are missing client-facing content.");
  if (!hasAdvisorContent) throw new Error("One or more briefings are missing advisor-facing content.");
  if (!hasRiskLevels) throw new Error("One or more briefings have invalid risk levels.");
  if (!hasWorkflowStatuses) throw new Error("One or more briefings have invalid workflow statuses.");

  console.log("Client Briefings storage: operational");
  console.log(`firms: ${counts.firms}`);
  console.log(`firm_memberships: ${counts.firm_memberships}`);
  console.log(`firm_clients: ${counts.firm_clients}`);
  console.log(`client_briefing_settings: ${counts.client_briefing_settings}`);
  console.log(`client_briefings: ${counts.client_briefings}`);
  console.log(`client_briefing_events: ${counts.client_briefing_events}`);
  console.log(`demo firm: ${firm.name}`);
  console.log(`super admin firm membership: ${membership[0].role}`);
  console.log(`demo clients checked: ${clientIds.length}`);
  console.log("client briefing content: present");
  console.log("advisor briefing content: present");
  console.log("risk/status validation: passed");
}

verifyClientBriefings().catch((error) => {
  console.error("Client Briefings verification failed.");
  console.error(`Error message: ${error.message}`);
  process.exitCode = 1;
});
