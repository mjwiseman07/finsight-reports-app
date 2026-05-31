import {
  buildBriefingContent,
  getDemoFinancialMetrics,
  normalizeBriefing,
  normalizeBriefingDashboardRow,
  normalizeBriefingEvent,
  normalizeBriefingInput,
  normalizeBriefingSettings,
} from "./client-briefings";
import { auditFirmEvent, resolveFirmAccess } from "./firm-security";
import { supabaseAdmin } from "./supabase";

export function isBriefingSchemaError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || error?.code === "42703" || message.includes("schema cache") || message.includes("does not exist");
}

export function briefingSchemaResponse() {
  return Response.json(
    { error: "Client Briefings storage is not configured. Run supabase/migrations/20260530_create_client_briefings.sql in Supabase SQL Editor." },
    { status: 501 },
  );
}

export async function resolveBriefingAccess(request, clientId) {
  const access = await resolveFirmAccess(request, clientId ? { clientId } : {});
  if (access.response) return access;
  return access;
}

export async function loadFirmBranding(firmId) {
  const { data } = await supabaseAdmin
    .from("firms")
    .select("id, name, logo_url, advisor_name, reply_to_email, footer_disclaimer, custom_intro_message")
    .eq("id", firmId)
    .limit(1);

  return Array.isArray(data) ? data[0] || null : null;
}

export async function loadBriefingSettings(access, clientId = "") {
  let query = supabaseAdmin
    .from("client_briefing_settings")
    .select("id, firm_id, client_id, cadence, day_of_week, delivery_time, timezone, delivery_method, approval_required, is_active, created_at, updated_at")
    .in("firm_id", access.firmIds)
    .order("updated_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeBriefingSettings);
}

export async function upsertBriefingSettings(access, input) {
  const clientAccess = await resolveFirmClient(access, input.clientId);
  const firmId = clientAccess.firm_id;

  const { data, error } = await supabaseAdmin
    .from("client_briefing_settings")
    .upsert(
      {
        firm_id: firmId,
        client_id: input.clientId,
        cadence: input.cadence,
        day_of_week: input.dayOfWeek,
        delivery_time: input.deliveryTime,
        timezone: input.timezone,
        delivery_method: input.deliveryMethod,
        approval_required: input.approvalRequired,
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "firm_id,client_id" },
    )
    .select("id, firm_id, client_id, cadence, day_of_week, delivery_time, timezone, delivery_method, approval_required, is_active, created_at, updated_at")
    .limit(1);

  if (error) throw error;

  await auditFirmEvent({
    eventType: "client_briefing_settings_updated",
    firmId,
    clientId: input.clientId,
    actorUserId: access.userId,
    metadata: { cadence: input.cadence, delivery_method: input.deliveryMethod, approval_required: input.approvalRequired },
  });

  return normalizeBriefingSettings(data?.[0] || {});
}

export async function resolveFirmClient(access, clientId) {
  const { data, error } = await supabaseAdmin
    .from("firm_clients")
    .select("id, firm_id, name, health_status, package_level, owner_user_id")
    .eq("id", clientId)
    .in("firm_id", access.firmIds)
    .limit(1);

  if (error) throw error;
  const client = Array.isArray(data) ? data[0] : null;
  if (!client) {
    const errorObject = new Error("Client is not available to this firm user.");
    errorObject.status = 403;
    throw errorObject;
  }
  return client;
}

export async function getLatestBriefings(access, clientIds = []) {
  if (!clientIds.length) return new Map();

  const { data, error } = await supabaseAdmin
    .from("client_briefings")
    .select("id, firm_id, client_id, period_start, period_end, briefing_type, status, client_briefing_content, advisor_briefing_content, missing_reports, risk_level, generated_at, approved_at, sent_at, created_by, updated_at")
    .in("firm_id", access.firmIds)
    .in("client_id", clientIds)
    .order("generated_at", { ascending: false });

  if (error) throw error;

  const latest = new Map();
  (data || []).forEach((briefing) => {
    if (!latest.has(briefing.client_id)) latest.set(briefing.client_id, briefing);
  });
  return latest;
}

export async function loadBriefingDashboard(access) {
  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("firm_clients")
    .select("id, firm_id, name, group_name, package_level, health_status, health_score, last_package_generated")
    .in("firm_id", access.firmIds)
    .order("name", { ascending: true });

  if (clientsError) throw clientsError;

  const clientIds = (clients || []).map((client) => client.id);
  const [settings, latestBriefings] = await Promise.all([
    loadBriefingSettings(access),
    getLatestBriefings(access, clientIds),
  ]);

  const settingsByClient = new Map(settings.map((setting) => [setting.clientId, setting]));
  const rows = (clients || []).map((client) =>
    normalizeBriefingDashboardRow({
      client,
      settings: settingsByClient.get(client.id) || { firmId: client.firm_id, clientId: client.id },
      briefing: latestBriefings.get(client.id),
    }),
  );

  return {
    rows,
    summary: {
      clients: rows.length,
      pendingApproval: rows.filter((row) => row.status === "Pending Approval").length,
      highRisk: rows.filter((row) => row.riskLevel === "High").length,
      missingData: rows.filter((row) => row.missingReports.length > 0).length,
    },
  };
}

export async function generateBriefing({ access, clientId, periodStart, periodEnd, metrics, forceStatus = "" }) {
  const client = await resolveFirmClient(access, clientId);
  const firm = await loadFirmBranding(client.firm_id);
  const settings = (await loadBriefingSettings(access, clientId))[0] || {
    firmId: client.firm_id,
    clientId,
    approvalRequired: true,
  };
  const resolvedMetrics = metrics && typeof metrics === "object" ? metrics : getDemoFinancialMetrics(client);
  const content = buildBriefingContent({
    client,
    firm,
    metrics: resolvedMetrics,
    missingReports: resolvedMetrics.missingReports || [],
  });
  const generatedAt = new Date().toISOString();
  const status = forceStatus || (settings.approvalRequired ? "Pending Approval" : "Approved");

  const { data, error } = await supabaseAdmin
    .from("client_briefings")
    .insert({
      firm_id: client.firm_id,
      client_id: clientId,
      period_start: periodStart || startOfCurrentMonth(),
      period_end: periodEnd || today(),
      briefing_type: "both",
      status,
      client_briefing_content: content.clientBriefingContent,
      advisor_briefing_content: content.advisorBriefingContent,
      missing_reports: content.missingReports,
      risk_level: content.riskLevel,
      generated_at: generatedAt,
      approved_at: status === "Approved" ? generatedAt : null,
      created_by: access.userId,
      updated_at: generatedAt,
    })
    .select("id, firm_id, client_id, period_start, period_end, briefing_type, status, client_briefing_content, advisor_briefing_content, missing_reports, risk_level, generated_at, approved_at, sent_at, created_by, updated_at")
    .limit(1);

  if (error) throw error;
  const briefing = normalizeBriefing({ ...(data?.[0] || {}), client_name: client.name, firm_name: firm?.name });

  await createBriefingEvent({
    briefingId: briefing.id,
    eventType: forceStatus === "Draft" ? "draft_created" : "briefing_generated",
    eventDescription: `Client and advisor briefings generated with ${content.riskLevel} risk.`,
    createdBy: access.userId,
  });

  await auditFirmEvent({
    eventType: "client_briefing_generated",
    firmId: client.firm_id,
    clientId,
    actorUserId: access.userId,
    metadata: { risk_level: content.riskLevel, missing_reports: content.missingReports, status },
  });

  return briefing;
}

export async function updateBriefingStatus({ access, briefingId, status, eventType, eventDescription }) {
  const briefing = await loadBriefingForFirm(access, briefingId);
  const now = new Date().toISOString();
  const update = {
    status,
    updated_at: now,
  };

  if (status === "Approved") update.approved_at = now;
  if (status === "Sent") {
    update.sent_at = now;
    if (!briefing.approvedAt) update.approved_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("client_briefings")
    .update(update)
    .eq("id", briefingId)
    .in("firm_id", access.firmIds)
    .select("id, firm_id, client_id, period_start, period_end, briefing_type, status, client_briefing_content, advisor_briefing_content, missing_reports, risk_level, generated_at, approved_at, sent_at, created_by, updated_at")
    .limit(1);

  if (error) throw error;

  await createBriefingEvent({
    briefingId,
    eventType,
    eventDescription,
    createdBy: access.userId,
  });

  await auditFirmEvent({
    eventType,
    firmId: briefing.firmId,
    clientId: briefing.clientId,
    actorUserId: access.userId,
    metadata: { status },
  });

  return normalizeBriefing(data?.[0] || {});
}

export async function loadBriefingForFirm(access, briefingId) {
  const { data, error } = await supabaseAdmin
    .from("client_briefings")
    .select("id, firm_id, client_id, period_start, period_end, briefing_type, status, client_briefing_content, advisor_briefing_content, missing_reports, risk_level, generated_at, approved_at, sent_at, created_by, updated_at")
    .eq("id", briefingId)
    .in("firm_id", access.firmIds)
    .limit(1);

  if (error) throw error;
  const briefing = data?.[0];
  if (!briefing) {
    const errorObject = new Error("Briefing is not available to this firm user.");
    errorObject.status = 404;
    throw errorObject;
  }
  return normalizeBriefing(briefing);
}

export async function loadBriefingHistory(access, clientId = "") {
  let query = supabaseAdmin
    .from("client_briefings")
    .select("id, firm_id, client_id, period_start, period_end, briefing_type, status, client_briefing_content, advisor_briefing_content, missing_reports, risk_level, generated_at, approved_at, sent_at, created_by, updated_at")
    .in("firm_id", access.firmIds)
    .order("generated_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeBriefing);
}

export async function loadBriefingEvents(briefingId) {
  const { data, error } = await supabaseAdmin
    .from("client_briefing_events")
    .select("id, briefing_id, event_type, event_description, created_at, created_by")
    .eq("briefing_id", briefingId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeBriefingEvent);
}

export async function createBriefingEvent({ briefingId, eventType, eventDescription, createdBy }) {
  if (!briefingId) return;

  await supabaseAdmin
    .from("client_briefing_events")
    .insert({
      briefing_id: briefingId,
      event_type: eventType,
      event_description: eventDescription,
      created_by: createdBy || null,
    })
    .then(() => null);
}

export function startOfCurrentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function parseSettingsBody(body = {}) {
  const input = normalizeBriefingInput(body);
  if (!input.clientId) {
    const error = new Error("client_id is required.");
    error.status = 400;
    throw error;
  }
  return input;
}

export function routeErrorResponse(error, fallbackMessage = "Client Briefings request failed.") {
  if (isBriefingSchemaError(error)) return briefingSchemaResponse();
  return Response.json({ error: error?.message || fallbackMessage }, { status: error?.status || 500 });
}
