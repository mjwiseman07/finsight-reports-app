import { supabaseAdmin } from "./supabase";

function sanitizeMetadata(metadata = {}) {
  const blockedKeys = new Set(["token", "access_token", "refresh_token", "password", "secret", "api_key", "authorization"]);
  return Object.fromEntries(
    Object.entries(metadata || {}).filter(([key]) => !blockedKeys.has(String(key).toLowerCase())),
  );
}

export async function auditSecurityEvent({
  eventType,
  actorUserId = null,
  actorEmail = null,
  targetUserId = null,
  firmId = null,
  companyId = null,
  clientId = null,
  resourceType = null,
  resourceId = null,
  metadata = {},
}) {
  if (!supabaseAdmin || !eventType) return { logged: false };

  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      event_type: eventType,
      actor_user_id: actorUserId,
      actor_email: actorEmail,
      target_user_id: targetUserId,
      firm_id: firmId,
      company_id: companyId,
      client_id: clientId,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata: sanitizeMetadata(metadata),
      created_at: new Date().toISOString(),
    });

    return { logged: !error, error };
  } catch (error) {
    return { logged: false, error };
  }
}
