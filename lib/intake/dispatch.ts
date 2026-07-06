import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseIntakeAddress,
  verifyToken,
  KNOWN_HANDLER_PREFIXES,
  type HandlerKey,
} from "./address";
import { getHandler } from "./handlers";
import type { IntakeAttachmentRecord, IntakeMessageRecord } from "./types";
import { publishEvent } from "@/lib/events/publisher";
import { classifyIntakeMessage } from "./classifier";

interface ResolutionResult {
  handlerKey: HandlerKey | null;
  firmId: string | null;
  companyId: string | null;
  firmClientId: string | null;
  reason: string;
  confidence?: number;
  resolution:
    | "address_matched"
    | "sender_domain_matched"
    | "classifier_matched"
    | "unresolved";
}

async function resolveByAddress(
  supabase: SupabaseClient,
  recipient: string,
): Promise<ResolutionResult> {
  const parsed = parseIntakeAddress(recipient);
  if (!parsed) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: "not_intake_domain",
      resolution: "unresolved",
    };
  }

  const handlerKey = KNOWN_HANDLER_PREFIXES[parsed.prefix];
  if (!handlerKey || !parsed.firmSlug || !parsed.token) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: "prefix_or_slug_or_token_missing",
      resolution: "unresolved",
    };
  }

  const { data: addr } = await supabase
    .from("firm_intake_addresses")
    .select("firm_id, company_id, token")
    .eq("handler_key", handlerKey)
    .eq("firm_slug", parsed.firmSlug)
    .eq("enabled", true)
    .maybeSingle();

  if (!addr) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: "address_not_provisioned",
      resolution: "unresolved",
    };
  }

  if (!verifyToken(handlerKey, parsed.firmSlug, addr.company_id, parsed.token)) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: "token_verification_failed",
      resolution: "unresolved",
    };
  }

  const { data: fc } = await supabase
    .from("firm_clients")
    .select("id")
    .eq("company_id", addr.company_id)
    .maybeSingle();

  return {
    handlerKey,
    firmId: addr.firm_id,
    companyId: addr.company_id,
    firmClientId: fc?.id ?? null,
    reason: "address_token_verified",
    resolution: "address_matched",
  };
}

async function resolveBySenderDomain(
  supabase: SupabaseClient,
  senderDomain: string | null,
): Promise<ResolutionResult> {
  if (!senderDomain) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: "no_sender_domain",
      resolution: "unresolved",
    };
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("firm_id, company_id")
    .eq("email_domain", senderDomain)
    .limit(1)
    .maybeSingle();

  if (!customer) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: "sender_domain_no_customer_match",
      resolution: "unresolved",
    };
  }

  const { data: fc } = await supabase
    .from("firm_clients")
    .select("id")
    .eq("company_id", customer.company_id)
    .maybeSingle();

  return {
    handlerKey: "cash_app_remit",
    firmId: customer.firm_id,
    companyId: customer.company_id,
    firmClientId: fc?.id ?? null,
    reason: "sender_domain_matched_customer",
    resolution: "sender_domain_matched",
  };
}

async function resolveByClassifier(
  supabase: SupabaseClient,
  message: IntakeMessageRecord,
): Promise<ResolutionResult> {
  const result = await classifyIntakeMessage(supabase, message);
  if (!result || result.confidence < result.floor) {
    return {
      handlerKey: null,
      firmId: null,
      companyId: null,
      firmClientId: null,
      reason: result
        ? `classifier_below_floor_${result.confidence.toFixed(3)}_lt_${result.floor.toFixed(3)}`
        : "classifier_disabled",
      resolution: "unresolved",
    };
  }

  return {
    handlerKey: result.handlerKey,
    firmId: result.firmId,
    companyId: result.companyId,
    firmClientId: result.firmClientId,
    confidence: result.confidence,
    reason: `classifier_confidence_${result.confidence.toFixed(3)}`,
    resolution: "classifier_matched",
  };
}

export async function resolveHandler(
  supabase: SupabaseClient,
  message: IntakeMessageRecord,
): Promise<ResolutionResult> {
  if (message.recipient_address) {
    const byAddr = await resolveByAddress(supabase, message.recipient_address);
    if (byAddr.handlerKey) return byAddr;
  }

  const byDomain = await resolveBySenderDomain(supabase, message.sender_domain);
  if (byDomain.handlerKey) return byDomain;

  return resolveByClassifier(supabase, message);
}

/**
 * Entitlement gate against engagement_addons (Doc D addon codes).
 * Missing rows default to allowed (prod has no engagement_addons rows yet);
 * an explicit is_active=false row denies.
 */
async function isEntitlementAllowed(
  supabase: SupabaseClient,
  firmId: string,
  addonCode: string,
): Promise<boolean> {
  const { data: engagements } = await supabase
    .from("engagements")
    .select("id")
    .eq("firm_id", firmId)
    .eq("status", "active");

  if (!engagements || engagements.length === 0) return true;

  const engagementIds = engagements.map((e) => e.id);
  const { data: addons } = await supabase
    .from("engagement_addons")
    .select("is_active")
    .in("engagement_id", engagementIds)
    .eq("addon_code", addonCode);

  if (!addons || addons.length === 0) return true;
  return addons.some((a) => a.is_active === true);
}

export async function dispatchMessage(
  supabase: SupabaseClient,
  message: IntakeMessageRecord,
  attachments: IntakeAttachmentRecord[],
): Promise<{ handlerKey: string | null; outcome: string; detail: unknown }> {
  const resolution = await resolveHandler(supabase, message);

  await supabase
    .from("intake_messages")
    .update({
      firm_id: resolution.firmId,
      company_id: resolution.companyId,
      firm_client_id: resolution.firmClientId,
      recipient_resolution: resolution.resolution,
      dispatch_handler_key: resolution.handlerKey,
      dispatch_reason: resolution.reason,
      dispatch_confidence: resolution.confidence ?? null,
    })
    .eq("id", message.id);

  if (!resolution.handlerKey || !resolution.firmId || !resolution.companyId) {
    await supabase
      .from("intake_messages")
      .update({ dispatch_status: "no_handler" })
      .eq("id", message.id);

    await publishEvent(
      {
        eventType: "intake_message_no_handler",
        eventCategory: "intake",
        firmId: resolution.firmId ?? undefined,
        firmClientId: resolution.firmClientId ?? undefined,
        aggregateType: "intake_message",
        aggregateId: message.id,
        actorType: "system",
        payload: { reason: resolution.reason },
      },
      supabase,
    );

    return { handlerKey: null, outcome: "no_handler", detail: { reason: resolution.reason } };
  }

  const { data: handlerGate } = await supabase
    .from("firm_intake_handlers")
    .select("enabled, required_entitlement")
    .eq("company_id", resolution.companyId)
    .eq("handler_key", resolution.handlerKey)
    .maybeSingle();

  if (!handlerGate || !handlerGate.enabled) {
    await supabase.from("intake_dispatch_log").insert({
      intake_message_id: message.id,
      firm_id: resolution.firmId,
      company_id: resolution.companyId,
      handler_key: resolution.handlerKey,
      outcome: "skipped_disabled",
      outcome_detail: { reason: "handler_disabled_for_firm" },
    });

    await supabase
      .from("intake_messages")
      .update({ dispatch_status: "no_handler" })
      .eq("id", message.id);

    await publishEvent(
      {
        eventType: "intake_message_no_handler",
        eventCategory: "intake",
        firmId: resolution.firmId,
        firmClientId: resolution.firmClientId ?? undefined,
        aggregateType: "intake_message",
        aggregateId: message.id,
        actorType: "system",
        payload: { reason: "handler_disabled_for_firm", handler_key: resolution.handlerKey },
      },
      supabase,
    );

    return { handlerKey: resolution.handlerKey, outcome: "skipped_disabled", detail: null };
  }

  if (handlerGate.required_entitlement) {
    const entitled = await isEntitlementAllowed(
      supabase,
      resolution.firmId,
      handlerGate.required_entitlement,
    );
    if (!entitled) {
      await supabase.from("intake_dispatch_log").insert({
        intake_message_id: message.id,
        firm_id: resolution.firmId,
        company_id: resolution.companyId,
        handler_key: resolution.handlerKey,
        outcome: "skipped_no_entitlement",
        outcome_detail: { entitlement: handlerGate.required_entitlement },
      });

      await supabase
        .from("intake_messages")
        .update({ dispatch_status: "no_handler" })
        .eq("id", message.id);

      return { handlerKey: resolution.handlerKey, outcome: "skipped_no_entitlement", detail: null };
    }
  }

  const handler = getHandler(resolution.handlerKey);
  if (!handler) {
    return {
      handlerKey: resolution.handlerKey,
      outcome: "no_handler",
      detail: { reason: "handler_class_not_registered" },
    };
  }

  const messageEnriched: IntakeMessageRecord & { firm_id: string; company_id: string } = {
    ...message,
    firm_id: resolution.firmId,
    company_id: resolution.companyId,
    firm_client_id: resolution.firmClientId,
  };

  await publishEvent(
    {
      eventType: "intake_message_dispatched",
      eventCategory: "intake",
      firmId: resolution.firmId,
      firmClientId: resolution.firmClientId ?? undefined,
      aggregateType: "intake_message",
      aggregateId: message.id,
      actorType: "system",
      payload: {
        handler_key: resolution.handlerKey,
        resolution: resolution.resolution,
        confidence: resolution.confidence ?? null,
      },
    },
    supabase,
  );

  const start = Date.now();
  let outcome;
  try {
    outcome = await handler.handle({
      supabase,
      message: messageEnriched,
      attachments,
    });
  } catch (e: unknown) {
    outcome = {
      status: "failed" as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const duration = Date.now() - start;
  const outcomeCode =
    outcome.status === "success"
      ? "success"
      : outcome.status === "failed"
        ? "failed"
        : "skipped_not_applicable";

  await supabase.from("intake_dispatch_log").insert({
    intake_message_id: message.id,
    firm_id: resolution.firmId,
    company_id: resolution.companyId,
    handler_key: resolution.handlerKey,
    outcome: outcomeCode,
    outcome_detail: outcome,
    duration_ms: duration,
  });

  await supabase
    .from("intake_messages")
    .update({
      dispatch_status: outcome.status === "success" ? "handler_success" : "handler_failed",
    })
    .eq("id", message.id);

  await publishEvent(
    {
      eventType:
        outcome.status === "success"
          ? "intake_message_handler_success"
          : "intake_message_handler_failed",
      eventCategory: "intake",
      firmId: resolution.firmId,
      firmClientId: resolution.firmClientId ?? undefined,
      aggregateType: "intake_message",
      aggregateId: message.id,
      actorType: "system",
      payload: {
        handler_key: resolution.handlerKey,
        duration_ms: duration,
        outcome_status: outcome.status,
      },
    },
    supabase,
  );

  return { handlerKey: resolution.handlerKey, outcome: outcome.status, detail: outcome };
}
